<template>
  <div class="cat-manage">
    <div class="page-header">
      <div class="header-title">分类管理</div>
      <van-button size="small" plain @click="openAdd" class="add-btn">+ 新增</van-button>
    </div>

    <div class="cat-list">
      <div v-for="cat in categories" :key="cat.id" class="cat-item">
        <div class="cat-icon">📂</div>
        <div class="cat-info">
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-sort">排序：{{ cat.sort }}</div>
        </div>
        <div class="cat-actions">
          <van-button size="mini" type="primary" plain @click="openEdit(cat)">编辑</van-button>
          <van-button size="mini" type="danger" plain @click="deleteCategory(cat.id)" style="margin-left:6px">删除</van-button>
        </div>
      </div>
      <van-empty v-if="categories.length === 0" description="暂无分类" />
    </div>

    <van-dialog v-model:show="showForm" :title="editing ? '编辑分类' : '新增分类'" show-cancel-button @confirm="saveCategory" confirm-button-color="#2563eb">
      <div style="padding: 16px">
        <van-field v-model="form.name" label="分类名称" placeholder="请输入" />
        <van-field v-model.number="form.sort" type="number" label="排序值" placeholder="数字越小越靠前" />
      </div>
    </van-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { categoryApi } from '../../api'

const categories = ref([])
const showForm = ref(false)
const editing = ref(null)
const form = ref({ name: '', sort: 0 })

function openAdd() { editing.value = null; form.value = { name: '', sort: 0 }; showForm.value = true }
function openEdit(cat) { editing.value = cat; form.value = { name: cat.name, sort: cat.sort }; showForm.value = true }

async function saveCategory() {
  try {
    if (editing.value) await categoryApi.update(editing.value.id, form.value)
    else await categoryApi.create(form.value)
    showToast({ type: 'success', message: '保存成功' })
    loadCategories()
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '保存失败' })
  }
}

async function deleteCategory(id) {
  await showConfirmDialog({ title: '确认', message: '删除该分类？（需先清空分类下的菜品）' })
  try {
    await categoryApi.delete(id)
    showToast({ type: 'success', message: '删除成功' })
    loadCategories()
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '该分类下有菜品，无法删除' })
  }
}

async function loadCategories() { categories.value = await categoryApi.list() }
onMounted(loadCategories)
</script>

<style scoped>
.cat-manage { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.add-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; }
.cat-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.cat-item {
  background: white; border-radius: 14px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow);
}
.cat-icon { font-size: 28px; }
.cat-info { flex: 1; }
.cat-name { font-weight: 600; font-size: 15px; color: var(--text1); }
.cat-sort { font-size: 12px; color: var(--text2); margin-top: 2px; }
.cat-actions { display: flex; }
</style>
