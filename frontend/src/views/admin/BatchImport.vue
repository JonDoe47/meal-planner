<template>
  <div class="batch-import">
    <div class="page-header">
      <van-icon name="arrow-left" size="20" color="white" @click="$router.back()" style="cursor:pointer" />
      <div class="header-title">批量导入菜品</div>
      <div style="width:20px"></div>
    </div>

    <!-- Step 1: 输入 -->
    <div v-if="step === 1" class="step-wrap">
      <van-tabs v-model:active="inputMode" color="#2563eb">
        <van-tab title="多个链接" name="urls">
          <div class="input-section">
            <p class="input-hint">每行一个B站链接或BV号，支持粘贴多条</p>
            <textarea
              v-model="urlsText"
              class="url-textarea"
              placeholder="https://www.bilibili.com/video/BVxxx&#10;BVyyy&#10;https://www.bilibili.com/video/BVzzz"
              rows="8"
            ></textarea>
            <van-button type="primary" round block :disabled="!urlsText.trim()" @click="prepareFromUrls" style="margin-top:16px">
              解析链接（{{ parsedUrlCount }} 个）
            </van-button>
          </div>
        </van-tab>
        <van-tab title="收藏夹" name="fav">
          <div class="input-section">
            <p class="input-hint">输入B站收藏夹链接，自动获取其中所有视频</p>
            <van-field
              v-model="favUrl"
              placeholder="https://space.bilibili.com/xxx/favlist?fid=xxx"
              class="fav-input"
              clearable
            />
            <van-button type="primary" round block :loading="fetchingFav" :disabled="!favUrl.trim()" @click="fetchFavorites" style="margin-top:16px">
              获取收藏夹视频
            </van-button>
          </div>
        </van-tab>
      </van-tabs>
    </div>

    <!-- 收藏夹视频列表选择 -->
    <div v-if="step === 1 && favVideos.length > 0" class="fav-list-wrap">
      <div class="fav-list-header">
        <span>共 {{ favVideos.length }} 个视频，已选 {{ favVideos.filter(v=>v.selected).length }} 个</span>
        <van-button size="mini" plain @click="toggleAllFav">{{ allFavSelected ? '取消全选' : '全选' }}</van-button>
      </div>
      <div class="fav-list">
        <div v-for="v in favVideos" :key="v.bvid" class="fav-item" @click="v.selected = !v.selected">
          <img :src="v.cover" class="fav-cover" />
          <div class="fav-info">
            <div class="fav-title">{{ v.title }}</div>
            <div class="fav-bvid">{{ v.bvid }}</div>
          </div>
          <van-checkbox :model-value="v.selected" @click.stop="v.selected = !v.selected" />
        </div>
      </div>
      <van-button type="primary" round block :disabled="!favVideos.some(v=>v.selected)" @click="startAnalyze" style="margin: 16px">
        开始解析选中视频（{{ favVideos.filter(v=>v.selected).length }} 个）
      </van-button>
    </div>

    <!-- Step 2: AI解析进度 -->
    <div v-if="step === 2" class="step-wrap">
      <div class="progress-card">
        <div class="progress-title">AI识别中...</div>
        <van-progress :percentage="progressPct" color="#2563eb" style="margin: 16px 0" />
        <div class="progress-text">{{ doneCount }} / {{ queue.length }} 已完成</div>
        <div class="progress-current" v-if="currentTitle">正在处理：{{ currentTitle }}</div>
      </div>

      <div v-if="results.length > 0" class="results-preview">
        <div v-for="(r, i) in results" :key="i" class="result-preview-item" :class="{ 'result-dup': r.isDuplicate, 'result-fail': r.failed }">
          <van-icon :name="r.failed ? 'warning-o' : r.isDuplicate ? 'info-o' : 'passed'" :color="r.failed ? '#ef4444' : r.isDuplicate ? '#f59e0b' : '#22c55e'" size="16" />
          <span class="result-preview-name">{{ r.dishName || r.title }}</span>
          <van-tag v-if="r.isDuplicate" type="warning" plain size="small">已存在</van-tag>
          <van-tag v-if="r.failed" type="danger" plain size="small">识别失败</van-tag>
        </div>
      </div>
    </div>

    <!-- Step 3: 确认添加 -->
    <div v-if="step === 3" class="step-wrap">
      <div class="confirm-header">
        <div class="confirm-stats">
          识别完成：<span class="stat-ok">{{ okResults.length }} 个新菜品</span>
          <span v-if="dupResults.length" class="stat-dup">，{{ dupResults.length }} 个重复跳过</span>
          <span v-if="failResults.length" class="stat-fail">，{{ failResults.length }} 个失败</span>
        </div>
        <van-button size="mini" plain @click="toggleAll">{{ allSelected ? '取消全选' : '全选' }}</van-button>
      </div>

      <div class="result-list">
        <div v-for="(r, i) in okResults" :key="i" class="result-item" :class="{ 'result-selected': r.selected, 'result-no-cat': r.selected && !r.categoryId }">
          <van-checkbox v-model="r.selected" style="flex-shrink:0" />
          <img v-if="r.cover" :src="r.cover" class="result-cover" />
          <div v-else class="result-no-img">🍽️</div>
          <div class="result-info">
            <van-field v-model="r.dishName" class="result-name-field" placeholder="菜品名称" />
            <div class="result-cat-row">
              <div class="result-cat-select" :class="{ 'cat-missing': r.selected && !r.categoryId }" @click="openCatPicker(i)">
                <van-icon v-if="r.selected && !r.categoryId" name="warning-o" size="12" color="#ef4444" style="flex-shrink:0" />
                {{ r.categoryId ? (categories.find(c=>c.id===r.categoryId)?.name || '选择分类') : '必须选择分类' }}
                <van-icon name="arrow-down" size="12" color="#94a3b8" />
              </div>
              <span class="result-ing-count">{{ r.ingredients?.length || 0 }} 种食材</span>
            </div>
          </div>
        </div>
        <van-empty v-if="okResults.length === 0" description="没有可添加的新菜品" />
      </div>

      <div class="confirm-footer">
        <van-button plain round @click="step = 1" style="flex:1">重新导入</van-button>
        <van-button type="primary" round :disabled="!okResults.some(r=>r.selected)" @click="batchSave" style="flex:2;margin-left:12px">
          添加选中菜品（{{ okResults.filter(r=>r.selected).length }} 个）
        </van-button>
      </div>
    </div>

    <!-- Step 4: 保存进度 -->
    <div v-if="step === 4" class="step-wrap">
      <div class="progress-card">
        <div class="progress-title">正在保存菜品...</div>
        <van-progress :percentage="saveProgressPct" color="#16a34a" style="margin: 16px 0" />
        <div class="progress-text">{{ saveDone }} / {{ saveTotal }} 已完成</div>
        <div class="progress-current" v-if="saveCurrent">正在保存：{{ saveCurrent }}</div>
      </div>
      <div v-if="saveResults.length > 0" class="results-preview">
        <div v-for="(r, i) in saveResults" :key="i" class="result-preview-item" :class="{ 'result-fail': !r.success }">
          <van-icon :name="r.success ? 'passed' : 'warning-o'" :color="r.success ? '#22c55e' : '#ef4444'" size="16" />
          <span class="result-preview-name">{{ r.name }}</span>
          <van-tag v-if="r.success" type="success" plain size="small">成功</van-tag>
          <van-tag v-else type="danger" plain size="small">失败</van-tag>
        </div>
      </div>
    </div>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCatPicker" position="bottom" round>
      <van-picker
        :columns="categoryOptions"
        @confirm="onCatConfirm"
        @cancel="showCatPicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast, showConfirmDialog } from 'vant'
import { biliApi, dishApi, categoryApi } from '../../api'

const step = ref(1)
const inputMode = ref('urls')
const urlsText = ref('')
const favUrl = ref('')
const favVideos = ref([])
const fetchingFav = ref(false)
const categories = ref([])
const queue = ref([]) // [{bvid, title, cover, url}]
const results = ref([])
const doneCount = ref(0)
const currentTitle = ref('')
const saving = ref(false)
const showCatPicker = ref(false)
const editingResultIdx = ref(null)
const saveDone = ref(0)
const saveTotal = ref(0)
const saveCurrent = ref('')
const saveResults = ref([])

const categoryOptions = computed(() => categories.value.map(c => ({ text: c.name, value: c.id })))

const parsedUrlCount = computed(() => {
  if (!urlsText.value.trim()) return 0
  return urlsText.value.split('\n').filter(l => l.trim().match(/BV[a-zA-Z0-9]+/)).length
})

const progressPct = computed(() => queue.value.length ? Math.round(doneCount.value / queue.value.length * 100) : 0)
const saveProgressPct = computed(() => saveTotal.value ? Math.round(saveDone.value / saveTotal.value * 100) : 0)
const okResults = computed(() => results.value.filter(r => !r.failed && !r.isDuplicate))
const dupResults = computed(() => results.value.filter(r => r.isDuplicate))
const failResults = computed(() => results.value.filter(r => r.failed))
const allSelected = computed(() => okResults.value.length > 0 && okResults.value.every(r => r.selected))
const allFavSelected = computed(() => favVideos.value.length > 0 && favVideos.value.every(v => v.selected))

function toggleAll() {
  const val = !allSelected.value
  okResults.value.forEach(r => r.selected = val)
}

function toggleAllFav() {
  const val = !allFavSelected.value
  favVideos.value.forEach(v => v.selected = val)
}

function prepareFromUrls() {
  const lines = urlsText.value.split('\n').filter(l => l.trim())
  const items = []
  for (const line of lines) {
    const m = line.match(/BV[a-zA-Z0-9]+/)
    if (m) items.push({ bvid: m[0], title: m[0], cover: '', url: `https://www.bilibili.com/video/${m[0]}` })
  }
  if (items.length === 0) { showToast({ type: 'fail', message: '未找到有效的BV号' }); return }
  queue.value = items
  startAnalyze()
}

async function fetchFavorites() {
  fetchingFav.value = true
  try {
    const { videos } = await biliApi.getFavorites(favUrl.value)
    if (!videos?.length) { showToast({ message: '收藏夹为空或无法获取' }); return }
    favVideos.value = videos.map(v => ({ ...v, selected: true }))
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '获取收藏夹失败' })
  } finally {
    fetchingFav.value = false
  }
}

async function startAnalyze() {
  if (favVideos.value.length > 0) {
    queue.value = favVideos.value.filter(v => v.selected)
  }
  if (queue.value.length === 0) return

  step.value = 2
  results.value = []
  doneCount.value = 0

  // 获取现有菜品名称用于去重
  const existingDishes = await dishApi.list({})
  const existingNames = new Set(existingDishes.map(d => d.name))

  const catNames = categories.value.map(c => c.name)

  for (const video of queue.value) {
    currentTitle.value = video.title
    try {
      const res = await biliApi.analyze(video.url, catNames)
      const dishName = res.dishName || video.title
      const isDuplicate = existingNames.has(dishName)

      // 匹配分类ID
      let categoryId = null
      if (res.category) {
        const matched = categories.value.find(c => c.name === res.category)
        if (matched) categoryId = matched.id
      }

      results.value.push({
        bvid: video.bvid,
        title: video.title,
        cover: res.imageUrl || video.cover || '',
        dishName,
        category: res.category || '',
        categoryId,
        ingredients: res.ingredients || [],
        isDuplicate,
        failed: false,
        selected: !isDuplicate
      })
    } catch (e) {
      results.value.push({
        bvid: video.bvid,
        title: video.title,
        cover: video.cover || '',
        dishName: video.title,
        failed: true,
        selected: false,
        ingredients: []
      })
    }
    doneCount.value++
  }

  currentTitle.value = ''
  step.value = 3
}

function openCatPicker(idx) {
  editingResultIdx.value = idx
  showCatPicker.value = true
}

function onCatConfirm({ selectedOptions }) {
  if (editingResultIdx.value !== null) {
    okResults.value[editingResultIdx.value].categoryId = Number(selectedOptions[0].value)
  }
  showCatPicker.value = false
  editingResultIdx.value = null
}

async function batchSave() {
  const toSave = okResults.value.filter(r => r.selected)
  if (toSave.length === 0) return

  const noCategory = toSave.filter(r => !r.categoryId)
  if (noCategory.length > 0) {
    await showConfirmDialog({
      title: `${noCategory.length} 道菜未选分类`,
      message: noCategory.map(r => `· ${r.dishName}`).join('\n') + '\n\n请点击每道菜的「必须选择分类」按钮完成选择',
      showCancelButton: false,
      confirmButtonText: '知道了',
      confirmButtonColor: '#2563eb'
    }).catch(() => {})
    return
  }

  // 切换到进度页
  saving.value = true
  saveTotal.value = toSave.length
  saveDone.value = 0
  saveCurrent.value = ''
  saveResults.value = []
  step.value = 4

  for (const r of toSave) {
    saveCurrent.value = r.dishName
    try {
      await dishApi.batch([{
        name: r.dishName,
        categoryId: r.categoryId,
        bvid: r.bvid,
        imageUrl: r.cover || null,
        ingredients: r.ingredients
      }])
      saveResults.value.push({ name: r.dishName, success: true })
    } catch (e) {
      saveResults.value.push({ name: r.dishName, success: false, error: e.message })
    }
    saveDone.value++
  }

  saveCurrent.value = ''
  saving.value = false

  const successCount = saveResults.value.filter(r => r.success).length
  const failCount = saveResults.value.filter(r => !r.success).length

  // 全部失败才停留，否则延迟后跳回首页
  if (successCount > 0) {
    showToast({ type: 'success', message: `成功添加 ${successCount} 道菜${failCount ? '，' + failCount + ' 个失败' : ''}` })
    setTimeout(() => {
      step.value = 1
      urlsText.value = ''
      favUrl.value = ''
      favVideos.value = []
      results.value = []
      queue.value = []
    }, failCount > 0 ? 3000 : 1500)
  } else {
    showToast({ type: 'fail', message: '全部保存失败，请检查后重试' })
  }
}

onMounted(async () => {
  categories.value = await categoryApi.list()
})
</script>

<style scoped>
.batch-import { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }

.step-wrap { padding: 16px; }
.input-section { padding: 16px 0; }
.input-hint { font-size: 13px; color: #64748b; margin-bottom: 10px; }
.url-textarea {
  width: 100%; box-sizing: border-box;
  border: 1.5px solid #e2e8f0; border-radius: 12px;
  padding: 12px; font-size: 14px; color: #1e293b;
  resize: vertical; font-family: monospace;
  outline: none;
}
.url-textarea:focus { border-color: #2563eb; }
.fav-input { border: 1.5px solid #e2e8f0; border-radius: 10px; }

.fav-list-wrap { padding: 0 16px 16px; }
.fav-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; font-size: 13px; color: #64748b; }
.fav-list { display: flex; flex-direction: column; gap: 8px; max-height: 50vh; overflow-y: auto; }
.fav-item { display: flex; align-items: center; gap: 10px; background: white; border-radius: 10px; padding: 8px; box-shadow: var(--shadow); cursor: pointer; }
.fav-cover { width: 60px; height: 40px; object-fit: cover; border-radius: 6px; flex-shrink: 0; background: #f1f5f9; }
.fav-info { flex: 1; min-width: 0; }
.fav-title { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.fav-bvid { font-size: 11px; color: #94a3b8; margin-top: 2px; }

.progress-card { background: white; border-radius: 16px; padding: 20px; box-shadow: var(--shadow); margin-bottom: 16px; }
.progress-title { font-size: 16px; font-weight: 700; color: #1e293b; }
.progress-text { text-align: center; font-size: 13px; color: #64748b; }
.progress-current { font-size: 12px; color: #94a3b8; margin-top: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.results-preview { display: flex; flex-direction: column; gap: 6px; max-height: 40vh; overflow-y: auto; }
.result-preview-item { display: flex; align-items: center; gap: 8px; background: white; border-radius: 8px; padding: 8px 12px; box-shadow: var(--shadow); }
.result-preview-name { flex: 1; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.result-dup { opacity: 0.6; }
.result-fail { opacity: 0.5; }

.confirm-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.confirm-stats { font-size: 13px; color: #64748b; }
.stat-ok { color: #16a34a; font-weight: 600; }
.stat-dup { color: #f59e0b; }
.stat-fail { color: #ef4444; }

.result-list { display: flex; flex-direction: column; gap: 10px; }
.result-item { display: flex; align-items: center; gap: 10px; background: white; border-radius: 12px; padding: 10px; box-shadow: var(--shadow); }
.result-cover { width: 56px; height: 40px; object-fit: cover; border-radius: 6px; flex-shrink: 0; }
.result-no-img { width: 56px; height: 40px; border-radius: 6px; background: #f1f5f9; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
.result-info { flex: 1; min-width: 0; }
.result-name-field { border: 1px solid #e2e8f0; border-radius: 8px; padding: 4px 0; font-size: 14px; }
.result-cat-row { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
.result-cat-select { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #64748b; border: 1px solid #e2e8f0; border-radius: 6px; padding: 3px 8px; cursor: pointer; }
.result-cat-select.cat-missing { color: #ef4444; border-color: #fca5a5; background: #fff5f5; font-weight: 600; }
.result-item.result-no-cat { border: 1.5px solid #fca5a5; }
.result-ing-count { font-size: 11px; color: #94a3b8; }

.confirm-footer { display: flex; padding: 16px; position: sticky; bottom: 60px; background: var(--bg); }
</style>
