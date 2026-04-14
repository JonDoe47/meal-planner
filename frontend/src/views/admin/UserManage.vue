<template>
  <div class="user-manage">
    <div class="page-header">
      <div>
        <div class="header-title">成员管理</div>
        <div class="header-count">管理家庭成员权限</div>
      </div>
      <van-button size="small" plain @click="openAdd" class="add-btn">+ 新增</van-button>
    </div>

    <!-- 待审批 -->
    <transition name="fade-up">
      <div v-if="pendingUsers.length > 0" class="section pending-section" :key="'pending' + pendingUsers.length">
        <div class="section-title-row">
          <span class="section-icon">⏳</span>
          <span>待审批</span>
          <van-tag type="warning" round size="small">{{ pendingUsers.length }}</van-tag>
        </div>
        <transition-group name="user-card-anim" tag="div" class="user-list">
          <div v-for="user in pendingUsers" :key="user.id" class="user-item pending-item">
            <div class="user-avatar pending-avatar">{{ user.name.charAt(0) }}</div>
            <div class="user-info">
              <div class="user-name">{{ user.name }}</div>
              <div class="user-meta">扫码申请 · {{ formatTime(user.createdAt) }}</div>
            </div>
            <div class="user-actions">
              <van-button size="mini" type="success" @click="approve(user.id)" round>通过</van-button>
              <van-button size="mini" type="danger" plain @click="reject(user.id)" round>拒绝</van-button>
            </div>
          </div>
        </transition-group>
      </div>
    </transition>

    <!-- 正式成员 -->
    <div class="section">
      <div class="section-title-row">
        <span class="section-icon">👥</span>
        <span>正式成员</span>
        <van-tag type="primary" plain round size="small">{{ users.length }}人</van-tag>
      </div>
      <transition-group name="user-card-anim" tag="div" class="user-list">
        <div v-for="user in users" :key="user.id" class="user-item" :class="{ 'self-item': user.id === currentUser?.id, 'vip-item': user.role === 'VIP' }">
          <div class="user-avatar" :class="{ 'vip-avatar': user.role === 'VIP' }">{{ user.name.charAt(0) }}</div>
          <div class="user-info">
            <div class="user-name">{{ user.name }}
              <span v-if="user.role === 'VIP'" class="vip-badge">👑 VIP</span>
              <van-tag v-else-if="user.role === 'ADMIN'" type="primary" size="mini" class="admin-badge">管理员</van-tag>
            </div>
            <div class="user-meta">@{{ user.username }} · {{ { ADMIN: '管理员', VIP: 'VIP成员', USER: '普通成员' }[user.role] || '普通成员' }}</div>
          </div>
          <div class="user-actions">
            <van-button size="mini" plain @click="openEdit(user)">编辑</van-button>
            <van-button v-if="user.id !== currentUser?.id && user.role !== 'ADMIN'" size="mini" :class="user.role === 'VIP' ? 'btn-unvip' : 'btn-vip'" plain @click="toggleVip(user)">
              {{ user.role === 'VIP' ? '取消VIP' : '设为VIP' }}
            </van-button>
            <van-button v-if="user.id !== currentUser?.id" size="mini" type="danger" plain @click="deleteUser(user.id)">删除</van-button>
          </div>
        </div>
      </transition-group>
    </div>

    <van-dialog v-model:show="showAddForm" title="新增成员" show-cancel-button @confirm="addUser" confirm-button-color="#2563eb" :before-close="beforeAddClose">
      <div style="padding: 16px">
        <van-field v-model="addForm.name" label="姓名" placeholder="显示名称（1-20字符）" :error-message="addErrors.name" />
        <van-field v-model="addForm.username" label="账号" placeholder="4-20位字母/数字/下划线" :error-message="addErrors.username" />
        <van-field v-model="addForm.password" type="password" label="密码" placeholder="8-32位，须含字母和数字" :error-message="addErrors.password" />
        <van-field label="角色" is-link readonly :model-value="{ ADMIN: '管理员', VIP: 'VIP成员', USER: '普通成员' }[addForm.role] || '普通成员'" @click="showRolePicker = true" />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showEditForm" title="编辑成员信息" show-cancel-button @confirm="saveEdit" confirm-button-color="#2563eb" :before-close="beforeEditClose">
      <div style="padding: 16px">
        <van-field v-model="editForm.name" label="姓名" placeholder="显示名称（1-20字符）" :error-message="editErrors.name" />
        <van-field v-model="editForm.username" label="登录账号" placeholder="4-20位字母/数字/下划线" :error-message="editErrors.username" />
        <van-field v-model="editForm.password" type="password" label="新密码" placeholder="8-32位，须含字母和数字（留空不修改）" :error-message="editErrors.password" />
      </div>
    </van-dialog>

    <van-popup v-model:show="showRolePicker" position="bottom" round>
      <van-picker :columns="[{ text: '普通成员', value: 'USER' }, { text: 'VIP成员', value: 'VIP' }, { text: '管理员', value: 'ADMIN' }]" @confirm="v => { addForm.role = v.selectedOptions[0].value; showRolePicker = false }" @cancel="showRolePicker = false" />
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
    if (addErrors.value.name || addErrors.value.username || addErrors.value.password) return false
  }
  return true
}
function beforeEditClose(action) {
  if (action === 'confirm') {
    editErrors.value.name = validateName(editForm.value.name)
    editErrors.value.username = validateUsername(editForm.value.username)
    editErrors.value.password = validatePassword(editForm.value.password, false)
    if (editErrors.value.name || editErrors.value.username || editErrors.value.password) return false
  }
  return true
}

function openAdd() { addForm.value = { name: '', username: '', password: '', role: 'USER' }; addErrors.value = { name: '', username: '', password: '' }; showAddForm.value = true }
function openEdit(user) { editingUserId.value = user.id; editForm.value = { name: user.name, username: user.username, password: '' }; editErrors.value = { name: '', username: '', password: '' }; showEditForm.value = true }

async function saveEdit() { try { await userApi.update(editingUserId.value, editForm.value); showToast({ type: 'success', message: '更新成功' }); loadAll() } catch (e) { showToast({ type: 'fail', message: e.message || '更新失败' }) } }
async function approve(id) { try { await userApi.approve(id); showToast({ type: 'success', message: '已审批通过' }); loadAll() } catch (e) { showToast({ type: 'fail', message: e.message || '操作失败' }) } }
async function reject(id) { await showConfirmDialog({ title: '确认拒绝', message: '确定拒绝该申请？' }); try { await userApi.reject(id); showToast({ type: 'success', message: '已拒绝' }); loadAll() } catch (e) {} }
async function addUser() { try { await userApi.create(addForm.value); showToast({ type: 'success', message: '创建成功' }); loadAll(); showAddForm.value = false } catch (e) { showToast({ type: 'fail', message: e.message || '用户名已存在' }) } }
async function deleteUser(id) { await showConfirmDialog({ title: '确认', message: '确定删除该成员？' }); try { await userApi.delete(id); showToast({ type: 'success', message: '删除成功' }); loadAll() } catch {} }
async function toggleVip(user) {
  const newRole = user.role === 'VIP' ? 'USER' : 'VIP'
  const label = newRole === 'VIP' ? '设为VIP' : '取消VIP'
  try {
    await userApi.setRole(user.id, newRole)
    showToast({ type: 'success', message: `已${label}` })
    loadAll()
  } catch (e) { showToast({ type: 'fail', message: e.message || '操作失败' }) }
}

async function loadAll() { const [all, pending] = await Promise.all([userApi.list(), userApi.pending()]); users.value = all; pendingUsers.value = pending }
onMounted(loadAll)
</script>

<style scoped>
.user-manage { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center;
  color: white; flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; }
.header-count { font-size: 12px; opacity: 0.85; font-weight: 500; }
.add-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; font-weight: 700; transition: all 0.2s; }
.add-btn:hover { background: rgba(255,255,255,0.3); }

.section { padding: var(--space-md); position: relative; z-index: 0; }
.section-title-row {
  font-size: 14px; font-weight: 700; color: var(--text2);
  padding: 4px 4px 10px; display: flex; align-items: center; gap: 6px;
}
.section-icon { font-size: 15px; }
.pending-section { background: linear-gradient(135deg, #fffbeb, #fef3c7); border-radius: var(--radius-md); margin-bottom: var(--space-md); padding: var(--space-md); box-shadow: var(--shadow-sm); border-left: 3px solid #f59e0b; }
.user-list { display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 0; }
.user-card-anim-move { transition: transform 0.35s ease; }
.user-card-anim-enter-active { transition: all 0.25s ease-out; }
.user-card-anim-enter-from { opacity: 0; transform: translateY(10px); }

.user-item {
  background: white; border-radius: var(--radius-md); padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow);
  transition: all 0.2s ease; border-left: 3px solid transparent;
}
.user-item:hover { border-color: var(--primary-mid); box-shadow: var(--shadow-md); transform: translateX(4px); }
.user-item.self-item { background: linear-gradient(135deg, #eff6ff, #f0f9ff); border-left-color: var(--primary); }
.user-item.pending-item { border-left-color: var(--warm-amber); background: linear-gradient(135deg, #fffbeb, #fefce8); }
.user-item.vip-item { background: linear-gradient(135deg, #fffbeb, #fef9e7); border-left-color: #f59e0b; }

.user-avatar {
  width: 46px; height: 46px; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white; font-size: 18px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0; box-shadow: 0 3px 10px rgba(37,99,235,0.2);
}
.pending-avatar { background: linear-gradient(135deg, #f97316, #fbbf24); box-shadow: 0 3px 10px rgba(249,115,22,0.2); }
.vip-avatar { background: linear-gradient(135deg, #f59e0b, #fbbf24); box-shadow: 0 3px 10px rgba(245,158,11,0.3); }
.user-info { flex: 1; min-width: 0; }
.user-name { font-weight: 700; font-size: 15px; color: var(--text1); display: flex; align-items: center; gap: 6px; letter-spacing: -0.2px; }
.admin-badge { transform: scale(0.85); font-size: 11px !important; }
.vip-badge { font-size: 11px; font-weight: 800; color: #92400e; background: linear-gradient(135deg, #fef3c7, #fde68a); padding: 1px 7px; border-radius: 10px; border: 1px solid #fcd34d; }
.btn-vip { color: #b45309 !important; border-color: #fcd34d !important; }
.btn-unvip { color: #64748b !important; border-color: #e2e8f0 !important; }
.user-meta { font-size: 12px; color: var(--text3); margin-top: 3px; font-weight: 500; }
.user-actions { display: flex; gap: 6px; }

.fade-up-enter-active { transition: all 0.3s ease-out; }
.fade-up-enter-from { opacity: 0; transform: translateY(-12px); }
</style>