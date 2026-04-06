<template>
  <div class="dish-manage">
    <div class="page-header">
      <div class="header-title">菜品管理</div>
      <div class="header-count">共 {{ dishes.length }} 道菜</div>
    </div>

    <!-- 分类筛选 -->
    <van-tabs v-model:active="activeCategory" color="#2563eb" shrink sticky offset-top="54" @change="loadDishes">
      <van-tab title="全部" name="all" />
      <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
    </van-tabs>

    <!-- 菜品列表 -->
    <div class="dish-list">
      <div v-for="dish in dishes" :key="dish.id" class="dish-item">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
          <div v-else class="dish-no-img">🍽️</div>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <div class="dish-tags">
            <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
            <van-tag v-if="dish.bvid" type="danger" plain size="small" style="margin-left:4px">B站视频</van-tag>
          </div>
          <div class="dish-desc" v-if="dish.description">{{ dish.description }}</div>
        </div>
        <div class="dish-actions">
          <van-button size="mini" type="primary" plain @click="openEdit(dish)">编辑</van-button>
          <van-button size="mini" type="danger" plain @click="deleteDish(dish.id)" style="margin-top:6px">删除</van-button>
        </div>
      </div>
      <van-empty v-if="dishes.length === 0" description="暂无菜品，点击右下角新增" />
    </div>

    <!-- FAB -->
    <div class="fab-group">
      <div class="fab fab-secondary" @click="$router.push('/admin/batch-import')">
        <van-icon name="records-o" size="18" color="white" />
        <span>批量导入</span>
      </div>
      <div class="fab" @click="openAdd">
        <van-icon name="plus" size="22" color="white" />
        <span>新增菜品</span>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <van-popup
      v-model:show="showForm"
      position="bottom"
      :style="{ height: '92%', borderRadius: '20px 20px 0 0' }"
      :close-on-click-overlay="false"
    >
      <div class="form-wrap">
        <div class="form-drag-bar"></div>
        <div class="form-title">{{ editing ? '编辑菜品' : '新增菜品' }}</div>

        <!-- 图片预览区 -->
        <div class="img-zone" @click="!previewImage && triggerUpload()">
          <img v-if="previewImage" :src="previewImage" class="preview-img" />
          <div v-else class="img-placeholder">
            <van-icon name="photograph" size="36" color="#bfdbfe" />
            <div style="font-size:13px;color:#94a3b8;margin-top:8px">点击上传图片</div>
          </div>
          <div class="img-overlay" v-if="previewImage">
            <van-button size="mini" plain @click.stop="triggerUpload()" style="margin-right:8px;color:white;border-color:white">换图</van-button>
            <van-button size="mini" plain @click.stop="removeImage()" style="color:white;border-color:white">删除</van-button>
          </div>
        </div>
        <input ref="fileInput" type="file" accept="image/*" style="display:none" @change="onFileChange" />

        <div class="form-fields">
          <!-- 菜品名称 -->
          <div class="field-item">
            <div class="field-label">菜品名称 <span class="req">*</span></div>
            <van-field v-model="form.name" placeholder="请输入菜品名称" class="f-input" :class="{ error: errors.name }" />
            <div class="err-msg" v-if="errors.name">请输入菜品名称</div>
          </div>

          <!-- 分类 -->
          <div class="field-item">
            <div class="field-label">菜品分类 <span class="req">*</span></div>
            <div class="select-box" :class="{ error: errors.categoryId }" @click="showCatPicker = true">
              <span :style="{ color: form.categoryId ? '#1e293b' : '#c8c9cc' }">
                {{ selectedCategoryName || '请选择分类' }}
              </span>
              <van-icon name="arrow-down" color="#94a3b8" />
            </div>
            <div class="err-msg" v-if="errors.categoryId">请选择分类</div>
          </div>

          <!-- B站链接 -->
          <div class="field-item">
            <div class="field-label">B站视频链接（可选）</div>
            <div class="bili-row">
              <van-field
                v-model="form.biliUrl"
                placeholder="粘贴B站链接，保存时自动获取封面"
                clearable
                class="f-input bili-input"
              />
              <van-button
                size="small"
                type="success"
                plain
                :loading="aiLoading"
                :disabled="!parsedBvid || aiLoading"
                @click="analyzeWithAI"
                style="margin-left:8px; height:44px; white-space:nowrap; flex-shrink:0"
              >AI识别</van-button>
            </div>
            <div class="bili-tip" v-if="parsedBvid">
              <van-icon name="passed" color="#16a34a" size="13" />
              已识别 {{ parsedBvid }}，可点击「AI识别」自动填充菜名和食材
            </div>
          </div>

          <!-- 食材 -->
          <div class="field-item">
            <div class="field-label">食材清单（可选）</div>
            <div class="ing-tags">
              <van-tag
                v-for="(ing, i) in ingredientList" :key="i"
                closeable type="primary" round
                @close="removeIngredient(i)"
                style="margin: 4px;"
              >{{ ing }}</van-tag>
            </div>
            <div class="ing-input-row">
              <van-field
                v-model="ingInput"
                placeholder="输入食材名称，回车添加"
                class="f-input ing-input"
                @keyup.enter="addIngredient"
              />
              <van-button size="small" type="primary" plain @click="addIngredient" style="margin-left:8px;height:44px">添加</van-button>
            </div>
            <div class="field-tip">例如：猪肉、土豆、葱、盐，点餐后自动推送给管理员</div>
          </div>

          <!-- 烹饪步骤 -->
          <div class="field-item">
            <div class="field-label" style="display:flex;align-items:center;gap:8px">
              烹饪步骤（可选）
              <van-button
                v-if="parsedBvid"
                size="mini" type="warning" plain
                :loading="stepsLoading"
                @click="generateSteps"
                style="font-size:12px"
              >AI生成做法</van-button>
              <span v-else style="font-size:11px;color:#94a3b8;font-weight:400">需先填写B站链接</span>
            </div>
            <div v-if="stepList.length > 0" class="steps-preview">
              <div v-for="(step, i) in stepList" :key="i" class="step-item-edit">
                <span class="step-num">{{ i + 1 }}</span>
                <span class="step-text">{{ step }}</span>
                <van-icon name="cross" size="14" color="#94a3b8" @click="removeStep(i)" style="flex-shrink:0;cursor:pointer" />
              </div>
              <van-button size="mini" plain :loading="stepsLoading" @click="generateSteps" style="margin-top:6px;font-size:12px;color:#94a3b8">重新生成</van-button>
            </div>
            <div v-else class="field-tip">填写B站链接后，点击「AI生成做法」自动生成分步说明</div>
          </div>

          <!-- 描述 -->
          <div class="field-item">
            <div class="field-label">描述（可选）</div>
            <van-field v-model="form.description" type="textarea" placeholder="菜品描述、做法小记..." rows="3" class="f-input" />
          </div>

          <van-button
            type="primary" round block
            :loading="formLoading"
            :loading-text="loadingText"
            @click="saveDish"
            style="margin-top: 8px; height: 48px; font-size: 16px; font-weight: 600;"
          >保存菜品</van-button>
        </div>
      </div>
    </van-popup>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCatPicker" position="bottom" round>
      <van-picker :columns="categoryOptions" @confirm="onCatConfirm" @cancel="showCatPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { dishApi, categoryApi, biliApi } from '../../api/index.js'

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
const ingredientList = ref([])
const ingInput = ref('')

function addIngredient() {
  const val = ingInput.value.trim()
  if (val && !ingredientList.value.includes(val)) {
    ingredientList.value.push(val)
  }
  ingInput.value = ''
}

function removeIngredient(i) {
  ingredientList.value.splice(i, 1)
}

const aiLoading = ref(false)
const stepsLoading = ref(false)
const stepList = ref([])

async function generateSteps() {
  if (!parsedBvid.value) return
  stepsLoading.value = true
  try {
    const res = await biliApi.getCookingSteps(parsedBvid.value)
    stepList.value = res.steps
    showToast({ type: 'success', message: `已生成 ${res.steps.length} 个步骤` })
  } catch (e) {
    showToast({ type: 'fail', message: e.message || 'AI生成失败，请稍后重试' })
  } finally {
    stepsLoading.value = false
  }
}

function removeStep(i) { stepList.value.splice(i, 1) }

async function analyzeWithAI() {
  if (!parsedBvid.value) return
  aiLoading.value = true
  try {
    const catNames = categories.value.map(c => c.name)
    const res = await biliApi.analyze(form.value.biliUrl, catNames)
    if (res.dishName && !form.value.name.trim()) {
      form.value.name = res.dishName
      errors.value.name = false
    }
    // 自动填充分类
    if (res.category && !form.value.categoryId) {
      const matched = categories.value.find(c => c.name === res.category)
      if (matched) {
        form.value.categoryId = matched.id
        errors.value.categoryId = false
      }
    }
    if (Array.isArray(res.ingredients) && res.ingredients.length > 0) {
      const existing = new Set(ingredientList.value)
      res.ingredients.forEach(ing => {
        if (ing && !existing.has(ing)) ingredientList.value.push(ing)
      })
      const catMsg = res.category ? `，分类：${res.category}` : ''
      showToast({ type: 'success', message: `AI识别成功：${res.ingredients.length} 种食材${catMsg}` })
    } else {
      showToast({ message: '未识别到食材，可手动添加', duration: 2500 })
    }
  } catch (e) {
    showToast({ type: 'fail', message: e.message || 'AI识别失败，请稍后重试' })
  } finally {
    aiLoading.value = false
  }
}

// BUG FIX: 用 Number() 转换确保类型匹配
const categoryOptions = computed(() => categories.value.map(c => ({ text: c.name, value: c.id })))
const selectedCategoryName = computed(() => {
  if (!form.value.categoryId) return ''
  return categories.value.find(c => c.id === Number(form.value.categoryId))?.name || ''
})

// 实时解析BV号
const parsedBvid = computed(() => {
  const match = form.value.biliUrl?.match(/BV[a-zA-Z0-9]+/)
  return match ? match[0] : ''
})

function triggerUpload() { fileInput.value?.click() }

function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  imageFile.value = file
  biliImageUrl.value = ''
  previewImage.value = URL.createObjectURL(file)
  e.target.value = ''
}

function removeImage() {
  imageFile.value = null
  biliImageUrl.value = ''
  previewImage.value = ''
}

// BUG FIX: 确保 categoryId 用 Number 存储
function onCatConfirm({ selectedOptions }) {
  form.value.categoryId = Number(selectedOptions[0].value)
  errors.value.categoryId = false
  showCatPicker.value = false
}

function validate() {
  errors.value.name = !form.value.name.trim()
  errors.value.categoryId = !form.value.categoryId
  return !errors.value.name && !errors.value.categoryId
}

function openAdd() {
  editing.value = null
  form.value = { name: '', categoryId: null, biliUrl: '', description: '' }
  ingredientList.value = []
  stepList.value = []
  ingInput.value = ''
  imageFile.value = null; biliImageUrl.value = ''; previewImage.value = ''
  errors.value = { name: false, categoryId: false }
  showForm.value = true
}

function openEdit(dish) {
  editing.value = dish
  form.value = {
    name: dish.name,
    categoryId: Number(dish.categoryId),
    biliUrl: dish.bvid ? `https://www.bilibili.com/video/${dish.bvid}` : '',
    description: dish.description || ''
  }
  try { ingredientList.value = dish.ingredients ? JSON.parse(dish.ingredients) : [] } catch { ingredientList.value = [] }
  try { stepList.value = dish.cookingSteps ? JSON.parse(dish.cookingSteps) : [] } catch { stepList.value = [] }
  ingInput.value = ''
  imageFile.value = null
  biliImageUrl.value = dish.imageUrl || ''
  previewImage.value = dish.imageUrl || ''
  errors.value = { name: false, categoryId: false }
  showForm.value = true
}

async function saveDish() {
  if (!validate()) {
    showToast({ type: 'fail', message: '请填写必填项' })
    return
  }
  formLoading.value = true

  try {
    // 有B站链接且没有手动上传图片时，自动获取封面
    if (parsedBvid.value && !imageFile.value && !biliImageUrl.value) {
      loadingText.value = '正在获取B站封面...'
      try {
        const res = await biliApi.getCover(form.value.biliUrl)
        biliImageUrl.value = res.imageUrl
        previewImage.value = res.imageUrl
      } catch {
        showToast({ message: '封面获取失败，将不带图片保存', duration: 2000 })
      }
    }

    loadingText.value = '保存中...'
    const fd = new FormData()
    fd.append('name', form.value.name.trim())
    fd.append('categoryId', form.value.categoryId)
    fd.append('bvid', parsedBvid.value || '')
    fd.append('description', form.value.description || '')
    fd.append('ingredients', ingredientList.value.length ? JSON.stringify(ingredientList.value) : '')
    fd.append('cookingSteps', stepList.value.length ? JSON.stringify(stepList.value) : '')
    if (imageFile.value) {
      fd.append('image', imageFile.value)
    } else if (biliImageUrl.value) {
      fd.append('existingImageUrl', biliImageUrl.value)
    }

    if (editing.value) await dishApi.update(editing.value.id, fd)
    else await dishApi.create(fd)

    showToast({ type: 'success', message: '保存成功！' })
    showForm.value = false
    loadDishes()
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '保存失败' })
  } finally {
    formLoading.value = false
    loadingText.value = '保存中...'
  }
}

async function deleteDish(id) {
  await showConfirmDialog({ title: '确认删除', message: '确定要删除这道菜吗？' })
  await dishApi.delete(id)
  showToast({ type: 'success', message: '删除成功' })
  loadDishes()
}

async function loadDishes() {
  const params = activeCategory.value !== 'all' ? { categoryId: activeCategory.value } : {}
  dishes.value = await dishApi.list(params)
}

onMounted(async () => {
  categories.value = await categoryApi.list()
  await loadDishes()
})
</script>

<style scoped>
.dish-manage { min-height: 100vh; background: var(--bg); padding-bottom: 90px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.header-count { font-size: 13px; opacity: 0.8; }

.dish-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dish-item {
  display: flex; align-items: center; background: white;
  border-radius: 14px; padding: 12px; box-shadow: var(--shadow); gap: 12px;
}
.dish-img-wrap { width: 72px; height: 72px; border-radius: 10px; overflow: hidden; flex-shrink: 0; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-no-img { width: 100%; height: 100%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.dish-info { flex: 1; min-width: 0; }
.dish-name { font-weight: 600; font-size: 15px; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-tags { margin-bottom: 4px; }
.dish-desc { font-size: 11px; color: var(--text2); margin-top: 4px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-actions { display: flex; flex-direction: column; flex-shrink: 0; }

.fab-group {
  position: fixed; bottom: 72px; right: 20px;
  display: flex; flex-direction: column; align-items: flex-end; gap: 10px;
  z-index: 100;
}
.fab {
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  color: white; border-radius: 28px;
  padding: 13px 20px;
  display: flex; align-items: center; gap: 6px;
  font-size: 15px; font-weight: 600;
  box-shadow: 0 6px 20px rgba(37,99,235,0.4);
  cursor: pointer;
}
.fab-secondary {
  background: linear-gradient(135deg, #0891b2, #06b6d4);
  padding: 10px 16px; font-size: 13px;
  box-shadow: 0 4px 14px rgba(8,145,178,0.4);
}

.form-wrap { height: 100%; display: flex; flex-direction: column; background: var(--bg); }
.form-drag-bar { width: 36px; height: 4px; background: #e2e8f0; border-radius: 2px; margin: 12px auto 0; flex-shrink: 0; }
.form-title { text-align: center; font-size: 16px; font-weight: 700; color: var(--text1); padding: 12px 0 8px; flex-shrink: 0; }

.img-zone {
  margin: 0 16px;
  height: 160px;
  background: white;
  border-radius: 14px;
  border: 2px dashed #bfdbfe;
  display: flex; align-items: center; justify-content: center;
  position: relative; overflow: hidden; cursor: pointer;
  flex-shrink: 0;
}
.preview-img { width: 100%; height: 100%; object-fit: cover; }
.img-placeholder { text-align: center; }
.img-overlay {
  position: absolute; inset: 0;
  background: rgba(0,0,0,0.4);
  display: flex; align-items: center; justify-content: center;
  opacity: 0; transition: opacity 0.2s;
}
.img-zone:hover .img-overlay { opacity: 1; }

.form-fields { flex: 1; overflow-y: auto; padding: 16px; }
.field-item { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.req { color: #ef4444; }
.err-msg { font-size: 12px; color: #ef4444; margin-top: 4px; }

.f-input { background: white; border-radius: 10px; border: 1.5px solid var(--border); }
.f-input.error { border-color: #ef4444; }

.select-box {
  background: white; border-radius: 10px; border: 1.5px solid var(--border);
  padding: 12px 14px; display: flex; justify-content: space-between; align-items: center;
  font-size: 14px; cursor: pointer;
}
.select-box.error { border-color: #ef4444; }

.bili-row { display: flex; gap: 8px; align-items: center; }
.bili-input { flex: 1; }
.bili-tip { display: flex; align-items: center; gap: 4px; font-size: 12px; color: #16a34a; margin-top: 6px; }

.ing-tags { display: flex; flex-wrap: wrap; min-height: 8px; margin-bottom: 6px; }
.ing-input-row { display: flex; align-items: center; }
.ing-input { flex: 1; }
.field-tip { font-size: 11px; color: #94a3b8; margin-top: 6px; }

.steps-preview { margin-top: 6px; display: flex; flex-direction: column; gap: 6px; }
.step-item-edit {
  display: flex; align-items: flex-start; gap: 8px;
  background: #f0fdf4; border-radius: 8px; padding: 8px 10px;
}
.step-num {
  width: 20px; height: 20px; border-radius: 50%;
  background: #16a34a; color: white;
  font-size: 11px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; margin-top: 1px;
}
.step-text { flex: 1; font-size: 13px; color: #1e293b; line-height: 1.5; }
</style>
