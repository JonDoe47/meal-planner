<template>
  <div class="user-manage">
    <div class="page-header">
      <div class="header-title">成员管理</div>
      <van-button size="small" plain @click="openAdd" class="add-btn">+ 新增</van-button>
    </div>

    <!-- 待审批 -->
    <div v-if="pendingUsers.length > 0" class="section">
      <div class="section-title">
        <span>待审批</span>
        <van-tag type="warning" round>{{ pendingUsers.length }}</van-tag>
      </div>
      <div class="user-list">
        <div v-for="user in pendingUsers" :key="user.id" class="user-item pending-item">
          <div class="user-avatar pending-avatar">{{ user.name.charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-meta">扫码申请 · {{ formatTime(user.createdAt) }}</div>
          </div>
          <div class="user-actions">
            <van-button size="mini" type="success" plain @click="approve(user.id)">通过</van-button>
            <van-button size="mini" type="danger" plain @click="reject(user.id)" style="margin-left:6px">拒绝</van-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 正式成员 -->
    <div class="section">
      <div class="section-title"><span>正式成员</span></div>
      <div class="user-list">
        <div v-for="user in users" :key="user.id" class="user-item">
          <div class="user-avatar">{{ user.name.charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}</div>
            <div class="user-meta">@{{ user.username }} · {{ user.role === 'ADMIN' ? '管理员' : '普通成员' }}</div>
          </div>
          <div class="user-actions">
            <van-button size="mini" plain @click="openEdit(user)">编辑</van-button>
            <van-button size="mini" type="danger" plain @click="deleteUser(user.id)" :disabled="user.id === currentUser.id" style="margin-left:6px">删除</van-button>
          </div>
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showAddForm" title="新增成员" show-cancel-button @confirm="addUser" confirm-button-color="#2563eb" :before-close="beforeAddClose">
      <div style="padding: 16px">
        <van-field
          v-model="addForm.name" label="姓名" placeholder="显示名称（1-20字符）"
          :error-message="addErrors.name"
        />
        <van-field
          v-model="addForm.username" label="账号" placeholder="4-20位字母/数字/下划线"
          :error-message="addErrors.username"
        />
        <van-field
          v-model="addForm.password" type="password" label="密码" placeholder="8-32位，须含字母和数字"
          :error-message="addErrors.password"
        />
        <van-field label="角色" is-link readonly :model-value="addForm.role === 'ADMIN' ? '管理员' : '普通成员'" @click="showRolePicker = true" />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showEditForm" title="编辑成员信息" show-cancel-button @confirm="saveEdit" confirm-button-color="#2563eb" :before-close="beforeEditClose">
      <div style="padding: 16px">
        <van-field
          v-model="editForm.name" label="姓名" placeholder="显示名称（1-20字符）"
          :error-message="editErrors.name"
        />
        <van-field
          v-model="editForm.username" label="登录账号" placeholder="4-20位字母/数字/下划线"
          :error-message="editErrors.username"
        />
        <van-field
          v-model="editForm.password" type="password" label="新密码" placeholder="8-32位，须含字母和数字（留空不修改）"
          :error-message="editErrors.password"
        />
      </div>
    </van-dialog>

    <van-popup v-model:show="showRolePicker" position="bottom" round>
      <van-picker
        :columns="[{ text: '普通成员', value: 'USER' }, { text: '管理员', value: 'ADMIN' }]"
        @confirm="v => { addForm.role = v.selectedOptions[0].value; showRolePicker = false }"
        @cancel="showRolePicker = false"
      />
    </van-popup>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showConfirmDialog, showToast } from 'vant'
import { userApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const currentUser = auth.user
const users = ref([])
const pendingUsers = ref([])
const showAddForm = ref(false)
const showEditForm = ref(false)
const showRolePicker = ref(false)
const editingUserId = ref(null)
const addForm = ref({ name: '', username: '', password: '', role: 'USER' })
const editForm = ref({ name: '', username: '', password: '' })
const addErrors = ref({ name: '', username: '', password: '' })
const editErrors = ref({ name: '', username: '', password: '' })

// 校验规则
function validateUsername(v) {
  if (!v || !v.trim()) return '请填写账号'
  if (v.trim().length < 4) return '账号至少4个字符'
  if (v.trim().length > 20) return '账号最多20个字符'
  if (!/^[a-zA-Z_][a-zA-Z0-9_]{3,19}$/.test(v.trim())) return '账号只能含字母、数字、下划线，且不能以数字开头'
  return ''
}
function validatePassword(v, required = true) {
  if (!v || v.length === 0) return required ? '请填写密码' : ''
  if (v.length < 8) return '密码至少8个字符'
  if (v.length > 32) return '密码最多32个字符'
  if (!/(?=.*[A-Za-z])(?=.*\d)/.test(v)) return '密码必须同时包含字母和数字'
  return ''
}
function validateName(v) {
  if (!v || !v.trim()) return '请填写姓名'
  if (v.trim().length > 20) return '姓名最多20个字符'
  return ''
}

function beforeAddClose(action) {
  if (action === 'confirm') {
    addErrors.value.name = validateName(addForm.value.name)
    addErrors.value.username = validateUsername(addForm.value.username)
    addErrors.value.password = validatePassword(addForm.value.password, true)
    if (addErrors.value.name || addErrors.value.username || addErrors.value.password) {
      return false // 阻止关闭，继续显示对话框
    }
  }
  return true
}

function beforeEditClose(action) {
  if (action === 'confirm') {
    editErrors.value.name = validateName(editForm.value.name)
    editErrors.value.username = validateUsername(editForm.value.username)
    editErrors.value.password = validatePassword(editForm.value.password, false)
    if (editErrors.value.name || editErrors.value.username || editErrors.value.password) {
      return false
    }
  }
  return true
}

function formatTime(t) {
  return new Date(t).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function openAdd() {
  addForm.value = { name: '', username: '', password: '', role: 'USER' }
  addErrors.value = { name: '', username: '', password: '' }
  showAddForm.value = true
}
function openEdit(user) {
  editingUserId.value = user.id
  editForm.value = { name: user.name, username: user.username, password: '' }
  editErrors.value = { name: '', username: '', password: '' }
  showEditForm.value = true
}

async function saveEdit() {
  try {
    await userApi.update(editingUserId.value, editForm.value)
    showToast({ type: 'success', message: '更新成功' })
    loadAll()
  } catch (e) { showToast({ type: 'fail', message: e.message || '更新失败' }) }
}

async function approve(id) {
  try {
    await userApi.approve(id)
    showToast({ type: 'success', message: '已审批通过' })
    loadAll()
  } catch (e) { showToast({ type: 'fail', message: e.message || '操作失败' }) }
}

async function reject(id) {
  await showConfirmDialog({ title: '确认拒绝', message: '确定拒绝该申请？' })
  try {
    await userApi.reject(id)
    showToast({ type: 'success', message: '已拒绝' })
    loadAll()
  } catch (e) { showToast({ type: 'fail', message: e.message || '操作失败' }) }
}

async function addUser() {
  try {
    await userApi.create(addForm.value)
    showToast({ type: 'success', message: '创建成功' })
    loadAll()
  } catch (e) { showToast({ type: 'fail', message: e.message || '用户名已存在' }) }
}

async function resetPassword() {
  try {
    await userApi.resetPassword(editingUserId.value, resetForm.value)
    showToast({ type: 'success', message: '密码重置成功' })
  } catch { showToast({ type: 'fail', message: '重置失败' }) }
}

async function deleteUser(id) {
  await showConfirmDialog({ title: '确认', message: '确定删除该成员？' })
  await userApi.delete(id)
  showToast({ type: 'success', message: '删除成功' })
  loadAll()
}

async function loadAll() {
  const [all, pending] = await Promise.all([userApi.list(), userApi.pending()])
  users.value = all
  pendingUsers.value = pending
}

onMounted(loadAll)
</script>

<style scoped>
.user-manage { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.add-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; }
.section { padding: 12px 12px 0; }
.section-title {
  font-size: 13px; font-weight: 600; color: #64748b;
  padding: 4px 4px 8px;
  display: flex; align-items: center; gap: 6px;
}
.user-list { display: flex; flex-direction: column; gap: 10px; margin-bottom: 12px; }
.user-item {
  background: white; border-radius: 14px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow);
}
.pending-item { border: 1.5px solid #fcd34d; background: #fffbeb; }
.user-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.pending-avatar { background: linear-gradient(135deg, #f59e0b, #fcd34d); }
.user-info { flex: 1; }
.user-name { font-weight: 600; font-size: 15px; color: var(--text1); }
.user-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.user-actions { display: flex; }
</style>
