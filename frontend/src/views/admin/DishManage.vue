<template>
  <div class="dish-manage">
    <van-nav-bar title="菜品管理" right-text="新增" @click-right="openAdd" />

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
    </div>

    <van-popup v-model:show="showForm" position="bottom" :style="{ height: '90%', borderRadius: '16px 16px 0 0' }">
      <div class="form-popup">
        <div class="form-header">
          <span>{{ editing ? '编辑菜品' : '新增菜品' }}</span>
          <van-icon name="cross" @click="showForm = false" />
        </div>
        <van-form @submit="saveDish">
          <van-cell-group inset>
            <van-field v-model="form.name" label="菜品名称" placeholder="请输入" :rules="[{ required: true }]" />
            <van-field label="分类" is-link readonly :value="selectedCategoryName" @click="showCatPicker = true" :rules="[{ required: true }]" />
            <van-field v-model="form.bvid" label="B站BV号" placeholder="如: BV1xx411c7mD (可选)" />
            <van-field v-model="form.description" label="描述" type="textarea" placeholder="可选" rows="2" />
          </van-cell-group>
          <div class="img-upload" style="padding: 12px 16px">
            <div style="margin-bottom:8px;color:#646566;font-size:14px">菜品图片</div>
            <van-uploader v-model="fileList" :max-count="1" :after-read="onFileRead" preview-size="100px" />
          </div>
          <div style="padding: 16px">
            <van-button type="primary" round block native-type="submit" :loading="formLoading">保存</van-button>
          </div>
        </van-form>
        <van-popup v-model:show="showCatPicker" position="bottom">
          <van-picker :columns="categoryOptions" @confirm="onCatConfirm" @cancel="showCatPicker = false" />
        </van-popup>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { dishApi, categoryApi } from '../../api'

const dishes = ref([])
const categories = ref([])
const activeCategory = ref('all')
const showForm = ref(false)
const editing = ref(null)
const formLoading = ref(false)
const showCatPicker = ref(false)
const fileList = ref([])
const imageFile = ref(null)

const form = ref({ name: '', categoryId: '', bvid: '', description: '' })

const categoryOptions = computed(() => categories.value.map(c => ({ text: c.name, value: c.id })))
const selectedCategoryName = computed(() => categories.value.find(c => c.id === form.value.categoryId)?.name || '')

function onFileRead(file) { imageFile.value = file.file }
function onCatConfirm({ selectedOptions }) {
  form.value.categoryId = selectedOptions[0].value
  showCatPicker.value = false
}

function openAdd() {
  editing.value = null
  form.value = { name: '', categoryId: '', bvid: '', description: '' }
  fileList.value = []
  imageFile.value = null
  showForm.value = true
}

function openEdit(dish) {
  editing.value = dish
  form.value = { name: dish.name, categoryId: dish.categoryId, bvid: dish.bvid || '', description: dish.description || '' }
  fileList.value = dish.imageUrl ? [{ url: dish.imageUrl }] : []
  imageFile.value = null
  showForm.value = true
}

async function saveDish() {
  formLoading.value = true
  try {
    const fd = new FormData()
    fd.append('name', form.value.name)
    fd.append('categoryId', form.value.categoryId)
    fd.append('bvid', form.value.bvid || '')
    fd.append('description', form.value.description || '')
    if (imageFile.value) fd.append('image', imageFile.value)
    if (editing.value) await dishApi.update(editing.value.id, fd)
    else await dishApi.create(fd)
    showToast({ type: 'success', message: '保存成功' })
    showForm.value = false
    loadDishes()
  } catch (e) {
    showToast({ type: 'fail', message: '保存失败' })
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
.dish-manage { padding-bottom: 20px; }
.dish-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dish-item { display: flex; align-items: center; background: white; border-radius: 12px; padding: 12px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); gap: 12px; }
.dish-img-wrap { width: 64px; height: 64px; border-radius: 8px; overflow: hidden; flex-shrink: 0; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-no-img { width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.dish-info { flex: 1; }
.dish-name { font-weight: 600; margin-bottom: 6px; }
.dish-actions { display: flex; flex-direction: column; }
.form-popup { height: 100%; overflow-y: auto; }
.form-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; font-size: 16px; font-weight: 700; border-bottom: 1px solid #f0f0f0; }
</style>
