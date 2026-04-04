<template>
  <div class="category-manage">
    <van-nav-bar title="分类管理" right-text="新增" @click-right="openAdd" />
    <div class="cat-list">
      <van-cell-group inset>
        <van-cell v-for="cat in categories" :key="cat.id" :title="cat.name" :label="`排序: ${cat.sort}`">
          <template #right-icon>
            <van-button size="mini" type="primary" plain @click="openEdit(cat)" style="margin-right:6px">编辑</van-button>
            <van-button size="mini" type="danger" plain @click="deleteCategory(cat.id)">删除</van-button>
          </template>
        </van-cell>
      </van-cell-group>
    </div>

    <van-dialog v-model:show="showForm" :title="editing ? '编辑分类' : '新增分类'" show-cancel-button @confirm="saveCategory">
      <div style="padding: 16px">
        <van-field v-model="form.name" label="分类名称" placeholder="请输入分类名称" />
        <van-field v-model.number="form.sort" type="number" label="排序" placeholder="数字越小越靠前" />
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
    showToast({ type: 'fail', message: e.message || '删除失败' })
  }
}

async function loadCategories() { categories.value = await categoryApi.list() }
onMounted(loadCategories)
</script>

<style scoped>
.category-manage { padding-bottom: 20px; }
.cat-list { padding: 12px; }
</style>
