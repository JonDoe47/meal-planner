<template>
  <div class="dish-manage">
    <div class="page-header">
      <div>
        <div class="header-title">菜品管理</div>
        <div class="header-count">共 {{ dishes.length }} 道菜</div>
      </div>
    </div>

    <!-- 分类筛选 -->
    <van-tabs v-model:active="activeCategory" color="#2563eb" shrink sticky offset-top="54" @change="loadDishes">
      <van-tab title="全部" name="all" />
      <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
    </van-tabs>

    <!-- 菜品列表 -->
    <transition-group name="dish-list-anim" tag="div" class="dish-list">
    <div v-for="dish in dishes" :key="dish.id" class="dish-item">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
          <div v-else class="dish-no-img">🍽️</div>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <div class="dish-tags">
            <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
            <van-tag v-if="dish.bvid" type="danger" plain size="small" class="bili-tag">B站视频</van-tag>
            <van-tag v-if="dish.avgRating" size="small" color="#f59e0b" plain>★ {{ dish.avgRating }}</van-tag>
          </div>
          <div class="dish-desc" v-if="dish.description">{{ dish.description }}</div>
        </div>
        <div class="dish-actions">
          <van-button size="mini" plain @click="openDetail(dish)">详情</van-button>
          <van-button size="mini" type="primary" plain @click="openEdit(dish)">编辑</van-button>
          <van-button size="mini" type="danger" plain @click="deleteDish(dish.id)">删除</van-button>
        </div>
      </div>
    </transition-group>
    <van-empty v-if="dishes.length === 0" description="暂无菜品，点击右下角新增" />

    <!-- FAB -->
    <div class="fab-single" @click="showAddSheet = true">
      <van-icon name="plus" size="26" color="white" />
    </div>

    <!-- 新增方式选择 -->
    <van-action-sheet
      v-model:show="showAddSheet"
      :actions="addActions"
      cancel-text="取消"
      @select="onAddAction"
      title="选择新增方式"
    />

    <!-- 新增/编辑弹窗 -->
    <van-popup
      v-model:show="showForm"
      position="bottom"
      :style="{ height: '92%', borderRadius: '20px 20px 0 0' }"
      :close-on-click-overlay="false"
    >
      <div class="form-wrap">
        <div class="form-drag-bar"></div>
        <div class="form-title">{{ editing ? '✏️ 编辑菜品' : '➕ 新增菜品' }}</div>

        <!-- 图片预览区 -->
        <div class="img-zone" @click="!previewImage && triggerUpload()">
          <img v-if="previewImage" :src="previewImage" class="preview-img" />
          <div v-else class="img-placeholder">
            <van-icon name="photograph" size="36" color="#bfdbfe" />
            <div style="font-size:13px;color:#94a3b8;margin-top:8px">点击上传图片</div>
          </div>
          <div class="img-overlay" v-if="previewImage">
            <van-button size="mini" plain @click.stop="triggerUpload()" class="overlay-btn">换图</van-button>
            <van-button size="mini" plain @click.stop="removeImage()" class="overlay-btn danger">删除</van-button>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />

        <div class="form-fields">
          <!-- 菜品名称 -->
          <div class="field-item">
            <div class="field-label"><span class="label-icon">📝</span> 菜品名称 <span class="req">*</span></div>
            <van-field v-model="form.name" placeholder="请输入菜品名称" class="f-input" :class="{ error: errors.name }" />
            <div class="err-msg" v-if="errors.name">请输入菜品名称</div>
            <div class="dup-warn" v-if="duplicateDish">
              <van-icon name="warning-o" color="#f59e0b" size="14" />
              <span v-if="dupByBvid">该B站视频已用于「{{ duplicateDish.name }}」（{{ duplicateDish.category.name }}），确认仍要新增？</span>
              <span v-else>已存在「{{ duplicateDish.name }}」（{{ duplicateDish.category.name }}），确认仍要新增？</span>
            </div>
          </div>

          <!-- 分类 -->
          <div class="field-item">
            <div class="field-label"><span class="label-icon">🏷️</span> 菜品分类 <span class="req">*</span></div>
            <div class="select-box" :class="{ error: errors.categoryId }" @click="showCatPicker = true">
              <span :style="{ color: form.categoryId ? '#1e293b' : '#c8c9cc' }">{{ selectedCategoryName || '请选择分类' }}</span>
              <van-icon name="arrow-down" color="#94a3b8" />
            </div>
            <div class="err-msg" v-if="errors.categoryId">请选择分类</div>
          </div>

          <!-- 视频（B站 / 本地） -->
          <div class="field-item field-section">
            <div class="field-label">
              <span class="label-icon">🎬</span> 视频（可选）
              <div class="video-mode-tabs">
                <span :class="['vm-tab', videoMode === 'bili' ? 'active' : '']" @click="videoMode = 'bili'">B站</span>
                <span :class="['vm-tab', videoMode === 'local' ? 'active' : '']" @click="videoMode = 'local'">本地视频</span>
              </div>
            </div>

            <!-- B站模式 -->
            <template v-if="videoMode === 'bili'">
              <div class="bili-row">
                <van-field v-model="form.biliUrl" placeholder="粘贴B站链接，自动识别菜品信息" clearable class="f-input bili-input" />
                <van-button size="small" type="primary" plain :disabled="!parsedBvid" @click="previewBvid = parsedBvid" class="action-btn">预览</van-button>
                <van-button size="small" type="success" plain :loading="aiLoading" :disabled="!parsedBvid || aiLoading" @click="analyzeWithAI" class="action-btn">AI识别</van-button>
              </div>
              <div class="bili-tip" v-if="parsedBvid">
                <van-icon name="passed" color="#16a34a" size="13" /> 已识别 {{ parsedBvid }}
              </div>
              <div v-if="previewBvid" class="video-preview">
                <iframe :src="`//player.bilibili.com/player.html?bvid=${previewBvid}&high_quality=1&danmaku=0`" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" class="bili-iframe"></iframe>
                <div class="video-close" @click="previewBvid = ''">收起视频</div>
              </div>
            </template>

            <!-- 本地视频模式 -->
            <template v-else>
              <div class="local-video-zone" @click="!videoPreviewUrl && triggerVideoUpload()">
                <video v-if="videoPreviewUrl" :src="videoPreviewUrl" class="local-video-preview" controls @click.stop />
                <div v-else class="local-video-placeholder">
                  <van-icon name="video-o" size="36" color="#bfdbfe" />
                  <div style="margin-top:8px;font-size:13px;color:#94a3b8">点击选择本地视频（支持手机/电脑）</div>
                  <div style="font-size:11px;color:#cbd5e1;margin-top:4px">MP4、MOV、AVI 等格式，最大 500MB</div>
                </div>
              </div>
              <input ref="videoInput" type="file" accept="video/*" style="display:none" @change="onVideoChange" />
              <div v-if="videoPreviewUrl" class="local-video-actions">
                <van-button size="mini" plain @click="triggerVideoUpload">重新选择</van-button>
                <van-button size="mini" type="danger" plain @click="removeVideo">删除视频</van-button>
                <span v-if="videoFile" class="video-size-tip">{{ videoFile.name }}（{{ (videoFile.size / 1024 / 1024).toFixed(1) }}MB）</span>
              </div>
            </template>
          </div>

          <!-- 食材 -->
          <div class="field-item">
            <div class="field-label"><span class="label-icon">🧄</span> 食材清单（可选）</div>
            <textarea
              v-model="ingText"
              class="ing-textarea"
              placeholder="每行一个食材，或用逗号分隔&#10;例如：猪肉, 土豆, 葱, 盐"
              rows="4"
            ></textarea>
            <div class="field-tip">每行一个或逗号分隔，用户点餐后汇总给管理员</div>
          </div>

          <!-- 烹饪步骤 -->
          <div class="field-item">
            <div class="field-label" style="display:flex;align-items:center;gap:8px">
              <span class="label-icon">👨‍🍳</span> 烹饪步骤（可选）
              <van-loading v-if="stepsLoading" size="14" color="#f59e0b" style="margin-left:4px" />
              <span v-else-if="!parsedBvid" style="font-size:11px;color:#94a3b8;font-weight:400">粘贴B站链接后自动生成</span>
            </div>
            <div v-if="stepList.length > 0" class="steps-preview">
              <div v-for="(step, i) in stepList" :key="i" class="step-item-edit">
                <span class="step-num">{{ i + 1 }}</span>
                <span class="step-text">{{ step }}</span>
                <van-icon name="cross" size="14" color="#94a3b8" @click="removeStep(i)" class="step-del" />
              </div>
              <van-button size="mini" plain :loading="stepsLoading" @click="generateSteps" class="re-gen-btn">重新生成</van-button>
            </div>
            <div v-else class="field-tip">填写B站链接后，点击「AI生成做法」自动生成分步说明</div>
          </div>

          <!-- 关联菜品 -->
          <div class="field-item binding-section" v-if="editing || bindingList.length > 0">
            <div class="field-label"><span class="label-icon">🔗</span> 关联菜品（如火锅→锅底/蘸料）</div>
            <div v-if="bindingList.length > 0" class="bind-list">
              <div class="bind-group" v-for="(group, type) in groupedBindings" :key="type">
                <div class="bind-type-label">{{ typeLabelMap[type] || type }}</div>
                <div class="bind-items">
                  <div v-for="(item, idx) in group" :key="item.dishId" class="bind-chip">
                    <span class="bind-name">{{ item.name }}</span>
                    <van-icon name="cross" size="11" color="#94a3b8" @click="removeBinding(item.dishId)" class="bind-del" />
                  </div>
                </div>
              </div>
            </div>
            <div class="bind-add-row">
              <div class="bind-select-box" @click="showBindDishPicker = true">
                <span :style="{ color: bindSelectedDish ? '#1e293b' : '#c8c9cc', fontSize: '13px' }">{{ bindSelectedDishName || '选择要关联的菜品' }}</span>
                <van-icon name="arrow-down" color="#94a3b8" />
              </div>
              <van-field v-model="newBindType" placeholder="类型(如锅底)" clearable class="bind-type-field" />
              <van-button size="small" type="primary" plain @click="addBindingItem" class="action-btn sm">添加</van-button>
            </div>
          </div>

          <!-- 描述 -->
          <div class="field-item">
            <div class="field-label"><span class="label-icon">📄</span> 描述（可选）</div>
            <van-field v-model="form.description" type="textarea" placeholder="菜品描述、做法小记..." rows="3" class="f-input" />
          </div>

          <van-button type="primary" round block :loading="formLoading" :loading-text="loadingText"
            @click="saveDish" class="save-btn">保存菜品</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCatPicker" position="bottom" round>
      <van-picker :columns="categoryOptions" @confirm="onCatConfirm" @cancel="showCatPicker = false" />
    </van-popup>

    <!-- 关联菜品选择器 -->
    <van-popup v-model:show="showBindDishPicker" position="bottom" round>
      <div style="padding:12px 16px">
        <div style="font-size:14px;font-weight:700;margin-bottom:10px;color:#475569">选择关联菜品</div>
        <div style="max-height:300px;overflow-y:auto">
          <div v-for="d in bindableDishes" :key="d.id" class="bind-dish-option" :class="{ selected: bindSelectedDish === d.id }" @click="selectBindDish(d)">
            <span style="font-size:14px">{{ d.name }}</span>
            <van-tag type="primary" plain size="small">{{ d.category.name }}</van-tag>
          </div>
          <van-empty v-if="bindableDishes.length === 0" description="暂无其他菜品可选" :image-size="60" />
        </div>
      </div>
    </van-popup>

    <!-- 菜品详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '88%', borderRadius: '20px 20px 0 0' }"
    >
      <div class="detail-wrap" v-if="detailDish">
        <div class="detail-handle"></div>
        <!-- 媒体区 -->
        <div class="detail-media">
          <video v-if="detailDish.videoUrl" :src="detailDish.videoUrl" class="detail-video" controls playsinline></video>
          <div class="detail-bili" v-else-if="detailDish.bvid">
            <iframe
              :src="`//player.bilibili.com/player.html?bvid=${detailDish.bvid}&high_quality=1&danmaku=0`"
              scrolling="no" frameborder="0" allowfullscreen
              style="width:100%;height:100%"
            ></iframe>
          </div>
          <img v-else-if="detailDish.imageUrl" :src="detailDish.imageUrl" class="detail-img" />
          <div v-else class="detail-placeholder">🍽️</div>
        </div>
        <!-- 内容 -->
        <div class="detail-body">
          <div class="detail-top-row">
            <div class="detail-name">{{ detailDish.name }}</div>
            <van-tag type="primary" plain>{{ detailDish.category.name }}</van-tag>
          </div>
          <div class="detail-badges">
            <van-tag v-if="detailDish.bvid" type="danger" plain size="small">B站视频</van-tag>
            <van-tag v-if="detailDish.avgRating" size="small" color="#f59e0b" plain>★ {{ detailDish.avgRating }} ({{ detailDish.ratingCount }})</van-tag>
          </div>
          <div class="detail-desc" v-if="detailDish.description">{{ detailDish.description }}</div>

          <!-- 食材 -->
          <div class="detail-section" v-if="parsedIngredients(detailDish).length > 0">
            <div class="detail-section-title">🧄 食材</div>
            <div class="detail-ing-row">
              <van-tag v-for="ing in parsedIngredients(detailDish)" :key="ing" type="success" plain round size="small" style="margin:3px">{{ ing }}</van-tag>
            </div>
          </div>

          <!-- 烹饪步骤 -->
          <div class="detail-section" v-if="parsedSteps(detailDish).length > 0">
            <div class="detail-section-title">👨‍🍳 做法步骤</div>
            <div class="detail-steps">
              <div v-for="(step, i) in parsedSteps(detailDish)" :key="i" class="detail-step-item">
                <div class="detail-step-badge">{{ i + 1 }}</div>
                <div class="detail-step-text">{{ step }}</div>
              </div>
            </div>
          </div>

          <div style="height:12px"></div>
          <van-button type="primary" round block @click="openEditFromDetail">✏️ 编辑此菜品</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { dishApi, categoryApi, biliApi, dishBindingApi } from '../../api/index.js'

const router = useRouter()

const dishes = ref([])
const categories = ref([])
const activeCategory = ref('all')
const showForm = ref(false)
const editing = ref(null)
const formLoading = ref(false)
const loadingText = ref('保存中...')
const showCatPicker = ref(false)
const fileInput = ref(null)
const imageFile = ref(null)
const biliImageUrl = ref('')
const previewImage = ref('')
const errors = ref({ name: false, categoryId: false })

const form = ref({ name: '', categoryId: null, biliUrl: '', description: '' })
const ingText = ref('')

function parseIngText() {
  return [...new Set(ingText.value.split(/[\n,，]+/).map(s => s.trim()).filter(Boolean))]
}

const aiLoading = ref(false)
const stepsLoading = ref(false)
const stepList = ref([])
const previewBvid = ref('')

// 本地视频
const videoMode = ref('bili') // 'bili' | 'local'
const videoInput = ref(null)
const videoFile = ref(null)
const videoPreviewUrl = ref('')
const existingVideoUrl = ref('')

function triggerVideoUpload() { videoInput.value?.click() }
function onVideoChange(e) {
  const file = e.target.files[0]; if (!file) return
  if (videoPreviewUrl.value && !existingVideoUrl.value) URL.revokeObjectURL(videoPreviewUrl.value)
  videoFile.value = file; existingVideoUrl.value = ''
  videoPreviewUrl.value = URL.createObjectURL(file)
  e.target.value = ''
}
function removeVideo() {
  if (videoPreviewUrl.value && !existingVideoUrl.value) URL.revokeObjectURL(videoPreviewUrl.value)
  videoFile.value = null; videoPreviewUrl.value = ''; existingVideoUrl.value = ''
}

// 关联菜品
const bindingList = ref([])
const bindableDishes = ref([])
const showBindDishPicker = ref(false)
const bindSelectedDish = ref(null)
const newBindType = ref('')
const typeLabelMap = { SAUCE: '🫗 蘸料', BASE: '🍲 锅底', SIDE: '🥗 配菜', MAIN: '🍚 主食', DRINK: '🥤 饮品' }

// 统一入口
const showAddSheet = ref(false)
const addActions = [
  { name: '新增单个菜品', subname: '手动填写或AI识别' },
  { name: '批量导入', subname: '从B站链接或收藏夹批量添加' }
]
function onAddAction(action) {
  showAddSheet.value = false
  if (action.name === '新增单个菜品') openAdd()
  else router.push('/admin/batch-import')
}

// 菜品详情查看
const showDetail = ref(false)
const detailDish = ref(null)
function openDetail(dish) { detailDish.value = dish; showDetail.value = true }
function openEditFromDetail() { showDetail.value = false; openEdit(detailDish.value) }

// 解析食材/步骤（详情弹窗复用）
function parsedIngredients(dish) { if (!dish?.ingredients) return []; try { return JSON.parse(dish.ingredients) } catch { return [] } }
function parsedSteps(dish) { if (!dish?.cookingSteps) return []; try { return JSON.parse(dish.cookingSteps) } catch { return [] } }

// 重复检测（按bvid优先，其次按名称）
const duplicateDish = computed(() => {
  if (editing.value) return null
  const bvid = parsedBvid.value
  if (bvid) {
    const byBvid = dishes.value.find(d => d.bvid === bvid)
    if (byBvid) return byBvid
  }
  const name = form.value.name.trim()
  if (name) return dishes.value.find(d => d.name === name) || null
  return null
})
const dupByBvid = computed(() => {
  if (!duplicateDish.value || !parsedBvid.value) return false
  return duplicateDish.value.bvid === parsedBvid.value
})

async function generateSteps() {
  if (!parsedBvid.value) return
  stepsLoading.value = true
  try {
    const res = await biliApi.getCookingSteps(parsedBvid.value)
    stepList.value = res.steps
    showToast({ type: 'success', message: `已生成 ${res.steps.length} 个步骤` })
  } catch (e) { showToast({ type: 'fail', message: e.message || 'AI生成失败' }) }
  finally { stepsLoading.value = false }
}
function removeStep(i) { stepList.value.splice(i, 1) }

const groupedBindings = computed(() => {
  const g = {}
  bindingList.value.forEach(b => {
    if (!g[b.type]) g[b.type] = []
    const dish = bindableDishes.value.find(d => d.id === b.boundDishId)
    if (dish) g[b.type].push({ dishId: b.boundDishId, name: dish.name })
  })
  return g
})
const bindSelectedDishName = computed(() => bindableDishes.value.find(d => d.id === bindSelectedDish.value)?.name || '')
function selectBindDish(dish) { bindSelectedDish.value = dish.id; showBindDishPicker.value = false }

function addBindingItem() {
  if (!bindSelectedDish.value || !newBindType.value.trim()) { showToast({ type: 'fail', message: '请选择菜品并填写类型' }); return }
  if (bindingList.value.some(b => b.boundDishId === bindSelectedDish.value)) { showToast({ message: '该菜品已关联' }); return }
  bindingList.value.push({ boundDishId: bindSelectedDish.value, type: newBindType.value.trim(), sort: bindingList.value.length })
  bindSelectedDish.value = null; newBindType.value = ''
}
function removeBinding(boundDishId) { bindingList.value = bindingList.value.filter(b => b.boundDishId !== boundDishId) }

async function loadBindings(dishId) {
  try {
    const res = await dishBindingApi.list(dishId)
    const list = []
    Object.keys(res).forEach(type => { res[type].forEach(item => list.push({ boundDishId: item.dishId, type, sort: item.sort ?? 0 })) })
    bindingList.value = list
  } catch { bindingList.value = [] }
}

async function saveBindings(dishId) { try { await dishBindingApi.save({ dishId, bindings: bindingList.value }) } catch {} }

async function analyzeWithAI() {
  if (!parsedBvid.value) return; aiLoading.value = true
  try {
    const catNames = categories.value.map(c => c.name)
    const res = await biliApi.analyze(form.value.biliUrl, catNames)
    if (res.dishName && !form.value.name.trim()) { form.value.name = res.dishName; errors.value.name = false }
    if (res.category && !form.value.categoryId) { const matched = categories.value.find(c => c.name === res.category); if (matched) { form.value.categoryId = matched.id; errors.value.categoryId = false } }
    if (Array.isArray(res.ingredients) && res.ingredients.length > 0) {
      const existing = parseIngText(); const existingSet = new Set(existing)
      const merged = [...existing, ...res.ingredients.filter(ing => ing && !existingSet.has(ing))]
      ingText.value = merged.join('\n')
      showToast({ type: 'success', message: `AI识别成功：${res.ingredients.length} 种食材${res.category ? `，分类：${res.category}` : ''}` })
    } else { showToast({ message: '未识别到食材', duration: 2500 }) }
  } catch (e) { showToast({ type: 'fail', message: e.message || 'AI识别失败' }) }
  finally { aiLoading.value = false }
}

const categoryOptions = computed(() => categories.value.map(c => ({ text: c.name, value: c.id })))
const selectedCategoryName = computed(() => categories.value.find(c => c.id === Number(form.value.categoryId))?.name || '')
const parsedBvid = computed(() => { const m = form.value.biliUrl?.match(/BV[a-zA-Z0-9]+/); return m ? m[0] : '' })

// 粘贴B站链接后自动识别名称/分类/食材+步骤
watch(parsedBvid, async (newBvid) => {
  if (!newBvid) return
  // 自动识别名称、分类、食材（未填写时）
  if (!form.value.name.trim() || ingredientList.value.length === 0) {
    await analyzeWithAI()
  }
  // 自动生成步骤（未填写时）
  if (!stepList.value.length) {
    await generateSteps()
  }
})

function triggerUpload() { fileInput.value?.click() }
function onFileChange(e) {
  const file = e.target.files[0]; if (!file) return
  imageFile.value = file; biliImageUrl.value = ''; previewImage.value = URL.createObjectURL(file); e.target.value = ''
}
function removeImage() { imageFile.value = null; biliImageUrl.value = ''; previewImage.value = '' }

function onCatConfirm({ selectedOptions }) { form.value.categoryId = Number(selectedOptions[0].value); errors.value.categoryId = false; showCatPicker.value = false }

function validate() { errors.value.name = !form.value.name.trim(); errors.value.categoryId = !form.value.categoryId; return !errors.value.name && !errors.value.categoryId }

function openAdd() {
  editing.value = null; form.value = { name: '', categoryId: null, biliUrl: '', description: '' }
  ingText.value = ''; stepList.value = []; previewBvid.value = ''
  imageFile.value = null; biliImageUrl.value = ''; previewImage.value = ''; errors.value = { name: false, categoryId: false }
  bindingList.value = []; bindSelectedDish.value = null; newBindType.value = ''
  videoMode.value = 'bili'; videoFile.value = null; videoPreviewUrl.value = ''; existingVideoUrl.value = ''
  showForm.value = true
}

function openEdit(dish) {
  editing.value = dish
  form.value = { name: dish.name, categoryId: Number(dish.categoryId), biliUrl: dish.bvid ? `https://www.bilibili.com/video/${dish.bvid}` : '', description: dish.description || '' }
  try { ingText.value = dish.ingredients ? JSON.parse(dish.ingredients).join('\n') : '' } catch { ingText.value = '' }
  try { stepList.value = dish.cookingSteps ? JSON.parse(dish.cookingSteps) : [] } catch { stepList.value = [] }
  previewBvid.value = ''; imageFile.value = null; biliImageUrl.value = dish.imageUrl || ''; previewImage.value = dish.imageUrl || ''
  errors.value = { name: false, categoryId: false }; bindingList.value = []; bindSelectedDish.value = null; newBindType.value = ''
  if (dish.videoUrl) {
    videoMode.value = 'local'; existingVideoUrl.value = dish.videoUrl; videoPreviewUrl.value = dish.videoUrl; videoFile.value = null
  } else {
    videoMode.value = 'bili'; videoFile.value = null; videoPreviewUrl.value = ''; existingVideoUrl.value = ''
  }
  loadBindings(dish.id); showForm.value = true
}

async function saveDish() {
  if (!validate()) { showToast({ type: 'fail', message: '请填写必填项' }); return }
  formLoading.value = true
  try {
    if (videoMode.value === 'local' && videoFile.value) {
      loadingText.value = '正在上传视频...'
    } else if (parsedBvid.value && !imageFile.value && !biliImageUrl.value) {
      loadingText.value = '正在获取B站封面...'
      try { const res = await biliApi.getCover(form.value.biliUrl); biliImageUrl.value = res.imageUrl; previewImage.value = res.imageUrl } catch {}
    }
    loadingText.value = '保存中...'
    const fd = new FormData()
    fd.append('name', form.value.name.trim()); fd.append('categoryId', form.value.categoryId)
    fd.append('bvid', videoMode.value === 'local' ? '' : (parsedBvid.value || ''))
    fd.append('description', form.value.description || '')
    fd.append('ingredients', parseIngText().length ? JSON.stringify(parseIngText()) : '')
    fd.append('cookingSteps', stepList.value.length ? JSON.stringify(stepList.value) : '')
    if (imageFile.value) fd.append('image', imageFile.value)
    else if (biliImageUrl.value) fd.append('existingImageUrl', biliImageUrl.value)
    if (videoMode.value === 'local') {
      if (videoFile.value) fd.append('video', videoFile.value)
      else if (existingVideoUrl.value) fd.append('existingVideoUrl', existingVideoUrl.value)
    }

    if (editing.value) await dishApi.update(editing.value.id, fd)
    else {
      const newDish = await dishApi.create(fd)
      if (bindingList.value.length > 0) await saveBindings(newDish.id)
      showToast({ type: 'success', message: '保存成功！' }); showForm.value = false; loadDishes(); return
    }
    if (editing.value) await saveBindings(editing.value.id)
    showToast({ type: 'success', message: '保存成功！' }); showForm.value = false; loadDishes()
  } catch (e) { showToast({ type: 'fail', message: e.message || '保存失败' }) }
  finally { formLoading.value = false; loadingText.value = '保存中...' }
}

async function deleteDish(id) { await showConfirmDialog({ title: '确认删除', message: '确定要删除这道菜吗？' }); await dishApi.delete(id); showToast({ type: 'success', message: '删除成功' }); loadDishes() }
async function loadDishes() { const params = activeCategory.value !== 'all' ? { categoryId: activeCategory.value } : {}; dishes.value = await dishApi.list(params) }

onMounted(async () => { categories.value = await categoryApi.list(); await loadDishes(); bindableDishes.value = await dishApi.list({}) })
</script>

<style scoped>
.dish-manage { min-height: 100vh; background: var(--bg); padding-bottom: 90px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center; color: white; flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; }
.header-count { font-size: 13px; opacity: 0.85; font-weight: 500; }

.dish-list { padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 0; }
.dish-list-anim-move { transition: transform 0.35s ease; }
.dish-list-anim-enter-active { transition: all 0.3s ease-out; }
.dish-list-anim-enter-from { opacity: 0; transform: translateX(-16px); }
.dish-item {
  display: flex; align-items: center; background: white;
  border-radius: var(--radius-md); padding: var(--space-md);
  box-shadow: var(--shadow); gap: var(--space-md);
  transition: all 0.2s ease; border: 1.5px solid transparent;
}
.dish-item:hover { border-color: #bfdbfe; box-shadow: var(--shadow-md); transform: translateX(4px); }
.dish-img-wrap { width: 72px; height: 72px; border-radius: var(--radius-sm); overflow: hidden; flex-shrink: 0; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-no-img { width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary-light), #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.dish-info { flex: 1; min-width: 0; }
.dish-name { font-weight: 700; font-size: 15px; margin-bottom: 6px; color: var(--text1); }
.dish-tags { margin-bottom: 4px; display: flex; gap: 5px; flex-wrap: wrap; align-items: center; }
.bili-tag { margin-left: 0 !important; }
.dish-desc { font-size: 11px; color: var(--text2); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-actions { display: flex; flex-direction: column; flex-shrink: 0; gap: 6px; }

/* FAB */
.fab-single {
  position: fixed; bottom: 80px; right: 20px;
  width: 56px; height: 56px; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  display: flex; align-items: center; justify-content: center;
  box-shadow: 0 6px 24px rgba(37,99,235,0.45); cursor: pointer;
  transition: all 0.25s ease; z-index: 100;
}
.fab-single:hover { transform: scale(1.1); box-shadow: 0 8px 30px rgba(37,99,235,0.55); }
.fab-single:active { transform: scale(0.92); }

/* 弹窗表单 */
.form-wrap { height: 100%; display: flex; flex-direction: column; background: var(--bg); }
.form-drag-bar { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto 0; flex-shrink: 0; }
.form-title { text-align: center; font-size: 17px; font-weight: 800; color: var(--text1); padding: 10px 0 8px; flex-shrink: 0; letter-spacing: -0.3px; }

.img-zone {
  margin: 0 var(--space-lg); height: 160px;
  background: white; border-radius: var(--radius-md);
  border: 2.5px dashed var(--primary-mid);
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden; cursor: pointer; flex-shrink: 0;
  transition: all 0.25s;
}
.img-zone:hover { border-color: var(--primary); background: var(--primary-light); }
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.img-placeholder { text-align: center; }
.img-overlay {
  position: absolute; inset: 0;
  background: rgba(15,23,42,0.55); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  gap: 8px; opacity: 0; transition: opacity 0.2s;
}
.img-zone:hover .img-overlay { opacity: 1; }
.overlay-btn { color: white !important; border-color: rgba(255,255,255,0.5) !important; font-weight: 600; }
.overlay-btn.danger { border-color: rgba(239,68,68,0.6) !important; }

.form-fields { flex: 1; overflow-y: auto; padding: var(--space-lg); -webkit-overflow-scrolling: touch; }
.field-item { margin-bottom: 20px; }
.field-section { background: linear-gradient(135deg, #fafafa, #f5f5f5); border-radius: var(--radius-md); padding: 14px; border: 1px solid var(--border-light); }
.field-label { font-size: 14px; font-weight: 700; color: var(--text1); margin-bottom: 10px; display: flex; align-items: center; gap: 6px; }
.label-icon { font-size: 15px; flex-shrink: 0; }
.req { color: #ef4444; font-weight: 800; margin-left: 2px; }
.err-msg { font-size: 12px; color: #ef4444; margin-top: 6px; font-weight: 500; }

.f-input { background: white; border-radius: var(--radius-sm); border: 1.5px solid var(--border); transition: all 0.2s; }
.f-input:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.f-input.error { border-color: #ef4444; }

.select-box {
  background: white; border-radius: var(--radius-sm); border: 1.5px solid var(--border);
  padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; cursor: pointer; transition: all 0.2s;
}
.select-box:focus-within { border-color: var(--primary); }
.select-box.error { border-color: #ef4444; }

.bili-row { display: flex; gap: 8px; align-items: center; }
.bili-input { flex: 1; }
.action-btn { margin-left: 8px; height: 40px; white-space: nowrap; flex-shrink: 0; font-weight: 600; }
.action-btn.sm { height: 36px; font-size: 12px; }
.bili-tip { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #16a34a; margin-top: 8px; font-weight: 600; background: #dcfce7; padding: 6px 10px; border-radius: var(--radius-sm); }

.video-preview { margin-top: 10px; border-radius: var(--radius-md); overflow: hidden; background: #000; box-shadow: var(--shadow); }
.bili-iframe { width: 100%; height: 200px; display: block; border: none; }
.video-close { text-align: center; padding: 8px; font-size: 12px; color: var(--text3); background: white; cursor: pointer; border-radius: 0 0 var(--radius-md) var(--radius-md); transition: background 0.15s; }
.video-close:active { background: #f1f5f9; }

/* 食材 & 步骤 */
.ing-textarea {
  width: 100%; box-sizing: border-box;
  border: 1.5px solid var(--border); border-radius: var(--radius-sm);
  padding: 10px 12px; font-size: 14px; color: var(--text1);
  resize: vertical; font-family: inherit; line-height: 1.6;
  outline: none; background: white; transition: all 0.2s;
}
.ing-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); }
.field-tip { font-size: 11px; color: var(--text3); margin-top: 8px; line-height: 1.45; }
.steps-preview { margin-top: 8px; display: flex; flex-direction: column; gap: 8px; }
.step-item-edit {
  display: flex; align-items: flex-start; gap: 8px;
  background: linear-gradient(135deg, #f0fdf4, #dcfce7); border-radius: var(--radius-sm); padding: 10px 12px;
  border-left: 3px solid var(--success-green); transition: transform 0.15s;
}
.step-item-edit:hover { transform: translateX(4px); }
.step-num {
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg, #22c55e, #4ade80); color: white;
  font-size: 11px; font-weight: 800; display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.step-text { flex: 1; font-size: 13px; color: var(--text1); line-height: 1.55; }
.step-del { flex-shrink: 0; cursor: pointer; transition: color 0.15s; }
.step-del:hover { color: #ef4444; }
.ai-step-btn { font-size: 12px; }
.re-gen-btn { margin-top: 6px; font-size: 12px; color: var(--text3); }

/* 关联菜品 */
.binding-section { background: linear-gradient(135deg, #fdf4ff, #fae8ff); border-color: #e9d5ff !important; }
.bind-list { margin-top: 8px; }
.bind-group { margin-bottom: 12px; }
.bind-type-label { font-size: 13px; font-weight: 700; color: var(--purple); margin-bottom: 8px; padding-left: 2px; }
.bind-items { display: flex; flex-wrap: wrap; gap: 6px; }
.bind-chip {
  display: flex; align-items: center; gap: 4px;
  background: white; border-radius: 16px;
  padding: 5px 12px; font-size: 12px; color: #6d28d9;
  border: 1px solid #ede9fe; font-weight: 600; transition: all 0.15s;
}
.bind-chip:hover { border-color: var(--purple); background: #faf5ff; }
.bind-name { max-width: 80px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.bind-del { cursor: pointer; transition: color 0.15s; flex-shrink: 0; }
.bind-del:hover { color: #ef4444; }

.bind-add-row { display: flex; gap: 8px; align-items: center; margin-top: 8px; }
.bind-select-box {
  background: white; border-radius: var(--radius-sm); border: 1.5px solid var(--border);
  padding: 8px 12px; display: flex; justify-content: space-between; align-items: center;
  min-width: 120px; cursor: pointer; flex-shrink: 0; transition: border-color 0.2s;
}
.bind-select-box:hover { border-color: var(--purple); }
.bind-type-field { flex: 1; border-radius: var(--radius-sm); }

.save-btn { margin-top: 8px; height: 48px; font-size: 16px; font-weight: 800; background: linear-gradient(135deg, #2563eb, #3b82f6); border: none; box-shadow: 0 4px 16px rgba(37,99,235,0.32); transition: all 0.25s; }
.save-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(37,99,235,0.25); }

/* 视频模式切换 */
.video-mode-tabs { display: flex; margin-left: auto; gap: 2px; background: #f1f5f9; border-radius: 8px; padding: 2px; }
.vm-tab { padding: 3px 10px; border-radius: 6px; font-size: 12px; font-weight: 600; color: #64748b; cursor: pointer; transition: all 0.15s; user-select: none; }
.vm-tab.active { background: white; color: #2563eb; box-shadow: 0 1px 4px rgba(0,0,0,0.1); }

.local-video-zone {
  background: white; border-radius: var(--radius-sm); border: 2px dashed #bfdbfe;
  min-height: 120px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; overflow: hidden; transition: all 0.2s; position: relative;
}
.local-video-zone:hover { border-color: #2563eb; background: #eff6ff; }
.local-video-preview { width: 100%; max-height: 220px; display: block; border-radius: var(--radius-sm); }
.local-video-placeholder { text-align: center; padding: 24px; }
.local-video-actions { display: flex; align-items: center; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
.video-size-tip { font-size: 11px; color: #94a3b8; flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.detail-video { width: 100%; height: 100%; display: block; object-fit: contain; background: #000; }

/* 重复警告 */
.dup-warn {
  display: flex; align-items: center; gap: 6px;
  background: #fef9c3; border: 1px solid #fde047;
  border-radius: var(--radius-sm); padding: 8px 12px;
  font-size: 12px; color: #854d0e; margin-top: 8px; font-weight: 500;
}

/* 菜品详情弹窗 */
.detail-wrap { height: 100%; overflow-y: auto; display: flex; flex-direction: column; }
.detail-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto; flex-shrink: 0; }
.detail-media { width: 100%; height: 220px; flex-shrink: 0; background: #000; }
.detail-bili { width: 100%; height: 100%; }
.detail-img { width: 100%; height: 100%; object-fit: cover; }
.detail-placeholder { width: 100%; height: 100%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 60px; }
.detail-body { padding: 16px 16px 32px; flex: 1; overflow-y: auto; }
.detail-top-row { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.detail-name { font-size: 20px; font-weight: 800; color: var(--text1); }
.detail-badges { display: flex; gap: 6px; margin-bottom: 10px; }
.detail-desc { font-size: 13px; color: var(--text2); line-height: 1.6; margin-bottom: 12px; }
.detail-section { margin-top: 16px; }
.detail-section-title { font-size: 13px; font-weight: 700; color: #64748b; margin-bottom: 8px; display: flex; align-items: center; gap: 4px; }
.detail-ing-row { display: flex; flex-wrap: wrap; }
.detail-steps { display: flex; flex-direction: column; gap: 8px; }
.detail-step-item {
  display: flex; align-items: flex-start; gap: 10px;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  border-radius: var(--radius-sm); padding: 10px 12px;
  border-left: 3px solid #fb923c;
}
.detail-step-badge {
  width: 22px; height: 22px; border-radius: 50%;
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: white; font-size: 11px; font-weight: 800;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-step-text { font-size: 13px; color: var(--text1); line-height: 1.55; flex: 1; }

/* 选择器弹窗选项 */
.bind-dish-option {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 0; border-bottom: 1px solid var(--border-light); cursor: pointer; transition: background 0.15s;
}
.bind-dish-option:last-child { border-bottom: none; }
.bind-dish-option:hover { background: var(--bg); padding-left: 8px; padding-right: 8px; border-radius: var(--radius-sm); }
.bind-dish-option.selected { color: var(--primary); font-weight: 700; }
</style>