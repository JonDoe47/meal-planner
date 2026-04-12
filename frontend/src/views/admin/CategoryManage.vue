<template>
  <div class="cat-manage">
    <div class="page-header">
      <div><div class="header-title">分类管理</div></div>
      <van-button size="small" plain @click="openAdd" class="add-btn">+ 新增</van-button>
    </div>

    <transition-group name="cat-anim" tag="div" class="cat-list">
      <div v-for="cat in categories" :key="cat.id" class="cat-item">
        <div class="cat-icon">📂</div>
        <div class="cat-info">
          <div class="cat-name">{{ cat.name }}</div>
          <div class="cat-sort"><span class="sort-label">排序</span> {{ cat.sort }}</div>
        </div>
        <div class="cat-actions">
          <van-button size="mini" type="primary" plain round @click="openEdit(cat)">编辑</van-button>
          <van-button size="mini" type="danger" plain round @click="deleteCategory(cat.id)">删除</van-button>
        </div>
      </div>
    </transition-group>

    <van-empty v-if="categories.length === 0" description="暂无分类，请添加" />

    <van-dialog v-model:show="showForm" :title="editing ? '✏️ 编辑分类' : '➕ 新增分类'" show-cancel-button @confirm="saveCategory" confirm-button-color="#2563eb">
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
  try { if (editing.value) await categoryApi.update(editing.value.id, form.value); else await categoryApi.create(form.value); showToast({ type: 'success', message: '保存成功' }); loadCategories() }
  catch (e) { showToast({ type: 'fail', message: e.message || '保存失败' }) }
}

async function deleteCategory(id) {
  await showConfirmDialog({ title: '确认删除', message: '删除该分类？（需先清空分类下的菜品）' })
  try { await categoryApi.delete(id); showToast({ type: 'success', message: '删除成功' }); loadCategories() }
  catch (e) { showToast({ type: 'fail', message: e.message || '该分类下有菜品，无法删除' }) }
}
async function loadCategories() { categories.value = await categoryApi.list() }
onMounted(loadCategories)
</script>

<style scoped>
.cat-manage { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center;
  color: white; flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; }
.add-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; font-weight: 700; transition: all 0.2s; }
.add-btn:hover { background: rgba(255,255,255,0.3); }

.cat-list { padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 0; }
.cat-anim-move { transition: transform 0.3s ease; }
.cat-anim-enter-active { transition: all 0.25s ease-out; }
.cat-anim-enter-from { opacity: 0; transform: translateY(8px); }

.cat-item {
  background: white; border-radius: var(--radius-md); padding: 16px;
  display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow);
  transition: all 0.2s ease; border-left: 3px solid transparent;
}
.cat-item:hover { border-color: var(--purple); box-shadow: var(--shadow-md); transform: translateX(4px); }
.cat-icon { font-size: 28px; flex-shrink: 0; transition: transform 0.25s; }
.cat-item:hover .cat-icon { transform: scale(1.15) rotate(-8deg); }
.cat-info { flex: 1; min-width: 0; }
.cat-name { font-weight: 700; font-size: 15px; color: var(--text1); margin-bottom: 4px; letter-spacing: -0.2px; }
.cat-sort { font-size: 12px; color: var(--text3); display: inline-flex; align-items: center; gap: 4px; }
.sort-label { background: var(--bg); padding: 2px 6px; border-radius: 8px; font-size: 11px; font-weight: 600; color: var(--text2); }
.cat-actions { display: flex; gap: 6px; }
</style>