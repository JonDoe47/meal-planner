<template>
  <div class="dish-manage">
    <van-nav-bar title="菜品管理" />
    <!-- 悬浮新增按钮 -->
    <div class="fab" @click="openAdd">
      <van-icon name="plus" size="24" color="white" />
      <span>新增菜品</span>
    </div>

    <div class="filter-bar">
      <van-tabs v-model:active="activeCategory" color="#ff6b35" shrink @change="loadDishes">
        <van-tab title="全部" name="all" />
        <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
      </van-tabs>
    </div>

    <div class="dish-list">
      <div v-for="dish in dishes" :key="dish.id" class="dish-item">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
          <div v-else class="dish-no-img">🍽️</div>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
          <van-tag v-if="dish.bvid" type="danger" plain size="small" style="margin-left:4px">有视频</van-tag>
        </div>
        <div class="dish-actions">
          <van-button size="mini" type="primary" plain @click="openEdit(dish)">编辑</van-button>
          <van-button size="mini" type="danger" plain @click="deleteDish(dish.id)" style="margin-top:4px">删除</van-button>
        </div>
      </div>
      <van-empty v-if="dishes.length === 0" description="暂无菜品" />
    </div>

    <!-- 新增/编辑弹窗 -->
    <van-popup v-model:show="showForm" position="bottom" :style="{ height: '92%', borderRadius: '16px 16px 0 0' }" :close-on-click-overlay="false">
      <div class="form-popup">
        <div class="form-header">
          <span>{{ editing ? '编辑菜品' : '新增菜品' }}</span>
          <van-icon name="cross" size="20" @click="showForm = false" />
        </div>

        <div class="form-body">
          <!-- 菜品名称 -->
          <div class="field-group">
            <div class="field-label">菜品名称 <span class="required">*</span></div>
            <van-field v-model="form.name" placeholder="请输入菜品名称" :class="{ 'field-error': errors.name }" />
            <div class="error-tip" v-if="errors.name">请输入菜品名称</div>
          </div>

          <!-- 分类选择 -->
          <div class="field-group">
            <div class="field-label">菜品分类 <span class="required">*</span></div>
            <div class="cat-select" :class="{ 'field-error': errors.categoryId }" @click="showCatPicker = true">
              <span :class="form.categoryId ? 'cat-value' : 'cat-placeholder'">
                {{ selectedCategoryName || '请选择分类' }}
              </span>
              <van-icon name="arrow" color="#999" />
            </div>
            <div class="error-tip" v-if="errors.categoryId">请选择分类</div>
          </div>

          <!-- B站链接 -->
          <div class="field-group">
            <div class="field-label">B站视频链接（可选）</div>
            <div class="bili-input-row">
              <van-field
                v-model="form.biliUrl"
                placeholder="粘贴B站链接或BV号，自动获取封面"
                clearable
                class="bili-field"
                @update:model-value="onBiliUrlChange"
              />
              <van-button
                size="small"
                type="danger"
                :loading="fetchingCover"
                :disabled="!form.biliUrl"
                @click="fetchBiliCover"
                class="bili-btn"
              >获取封面</van-button>
            </div>
            <div class="bvid-tip" v-if="form.bvid">已识别 BV号：{{ form.bvid }}</div>
          </div>

          <!-- 菜品图片 -->
          <div class="field-group">
            <div class="field-label">菜品图片</div>
            <div class="img-area">
              <div v-if="previewImage" class="img-preview-wrap">
                <img :src="previewImage" class="img-preview" />
                <van-icon name="cross" class="img-remove" @click="removeImage" />
              </div>
              <van-uploader v-else :after-read="onFileRead" accept="image/*">
                <div class="upload-btn">
                  <van-icon name="photograph" size="28" color="#ccc" />
                  <div style="font-size:12px;color:#999;margin-top:4px">上传图片</div>
                </div>
              </van-uploader>
            </div>
          </div>

          <!-- 描述 -->
          <div class="field-group">
            <div class="field-label">描述（可选）</div>
            <van-field v-model="form.description" type="textarea" placeholder="菜品描述..." rows="3" />
          </div>

          <van-button type="primary" round block :loading="formLoading" @click="saveDish" style="margin-top:8px">
            保存菜品
          </van-button>
        </div>
      </div>
    </van-popup>

    <!-- 分类选择器 -->
    <van-popup v-model:show="showCatPicker" position="bottom">
      <van-picker :columns="categoryOptions" @confirm="onCatConfirm" @cancel="showCatPicker = false" />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { dishApi, categoryApi, biliApi } from '../../api'

const dishes = ref([])
const categories = ref([])
const activeCategory = ref('all')
const showForm = ref(false)
const editing = ref(null)
const formLoading = ref(false)
const fetchingCover = ref(false)
const showCatPicker = ref(false)
const imageFile = ref(null)       // 用户手动上传的文件
const biliImageUrl = ref('')      // B站自动获取的图片路径
const previewImage = ref('')      // 当前预览图（优先展示）
const errors = ref({ name: false, categoryId: false })

const form = ref({ name: '', categoryId: null, biliUrl: '', bvid: '', description: '' })

const categoryOptions = computed(() => categories.value.map(c => ({ text: c.name, value: c.id })))
const selectedCategoryName = computed(() => categories.value.find(c => c.id === form.value.categoryId)?.name || '')

function onBiliUrlChange() {
  // 实时解析BV号
  const match = form.value.biliUrl.match(/BV[a-zA-Z0-9]+/)
  form.value.bvid = match ? match[0] : ''
}

async function fetchBiliCover() {
  if (!form.value.biliUrl) return
  fetchingCover.value = true
  try {
    const res = await biliApi.getCover(form.value.biliUrl)
    form.value.bvid = res.bvid
    biliImageUrl.value = res.imageUrl
    previewImage.value = res.imageUrl
    imageFile.value = null
    showToast({ type: 'success', message: '封面获取成功！' })
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '获取封面失败' })
  } finally {
    fetchingCover.value = false
  }
}

function onFileRead(file) {
  imageFile.value = file.file
  biliImageUrl.value = ''
  previewImage.value = URL.createObjectURL(file.file)
}

function removeImage() {
  imageFile.value = null
  biliImageUrl.value = ''
  previewImage.value = ''
}

function onCatConfirm({ selectedOptions }) {
  form.value.categoryId = selectedOptions[0].value
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
  form.value = { name: '', categoryId: null, biliUrl: '', bvid: '', description: '' }
  imageFile.value = null
  biliImageUrl.value = ''
  previewImage.value = ''
  errors.value = { name: false, categoryId: false }
  showForm.value = true
}

function openEdit(dish) {
  editing.value = dish
  form.value = {
    name: dish.name,
    categoryId: dish.categoryId,
    biliUrl: dish.bvid ? `https://www.bilibili.com/video/${dish.bvid}` : '',
    bvid: dish.bvid || '',
    description: dish.description || ''
  }
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
    const fd = new FormData()
    fd.append('name', form.value.name.trim())
    fd.append('categoryId', form.value.categoryId)
    fd.append('bvid', form.value.bvid || '')
    fd.append('description', form.value.description || '')
    // 优先用手动上传的图片，其次用B站封面路径
    if (imageFile.value) {
      fd.append('image', imageFile.value)
    } else if (biliImageUrl.value) {
      fd.append('existingImageUrl', biliImageUrl.value)
    }
    if (editing.value) await dishApi.update(editing.value.id, fd)
    else await dishApi.create(fd)
    showToast({ type: 'success', message: '保存成功' })
    showForm.value = false
    loadDishes()
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '保存失败' })
  } finally {
    formLoading.value = false
  }
}

async function deleteDish(id) {
  await showConfirmDialog({ title: '确认', message: '确定删除该菜品吗？' })
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
.dish-manage { padding-bottom: 80px; }
.fab { position: fixed; bottom: 70px; right: 16px; background: #ff6b35; color: white; border-radius: 28px; padding: 12px 20px; display: flex; align-items: center; gap: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 4px 16px rgba(255,107,53,0.45); z-index: 999; cursor: pointer; }
.dish-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dish-item { display: flex; align-items: center; background: white; border-radius: 12px; padding: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); gap: 12px; }
.dish-img-wrap { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-no-img { width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.dish-info { flex: 1; min-width: 0; }
.dish-name { font-weight: 600; margin-bottom: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-actions { display: flex; flex-direction: column; flex-shrink: 0; }

.form-popup { height: 100%; display: flex; flex-direction: column; }
.form-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; font-size: 16px; font-weight: 700; border-bottom: 1px solid #f0f0f0; flex-shrink: 0; }
.form-body { flex: 1; overflow-y: auto; padding: 16px; }

.field-group { margin-bottom: 16px; }
.field-label { font-size: 14px; color: #333; font-weight: 500; margin-bottom: 8px; }
.required { color: #ee0a24; }
.error-tip { font-size: 12px; color: #ee0a24; margin-top: 4px; }

.cat-select { display: flex; justify-content: space-between; align-items: center; background: #f7f8fa; border-radius: 8px; padding: 12px 14px; border: 1px solid transparent; }
.cat-select.field-error { border-color: #ee0a24; }
.cat-placeholder { color: #c8c9cc; font-size: 14px; }
.cat-value { color: #323233; font-size: 14px; }

.bili-input-row { display: flex; gap: 8px; align-items: center; }
.bili-field { flex: 1; background: #f7f8fa; border-radius: 8px; }
.bili-btn { flex-shrink: 0; }
.bvid-tip { font-size: 12px; color: #07c160; margin-top: 6px; }

.img-area { display: flex; gap: 12px; }
.img-preview-wrap { position: relative; width: 100px; height: 100px; border-radius: 8px; overflow: hidden; }
.img-preview { width: 100%; height: 100%; object-fit: cover; }
.img-remove { position: absolute; top: 4px; right: 4px; background: rgba(0,0,0,0.5); color: white; border-radius: 50%; padding: 2px; }
.upload-btn { width: 100px; height: 100px; border: 1px dashed #ddd; border-radius: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f7f8fa; }

:deep(.van-field) { background: #f7f8fa; border-radius: 8px; }
:deep(.van-field.field-error) { border: 1px solid #ee0a24; }
</style>
