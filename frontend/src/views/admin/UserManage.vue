<template>
  <div class="user-manage">
    <div class="page-header">
      <div class="header-title">成员管理</div>
      <van-button size="small" plain @click="openAdd" class="add-btn">+ 新增</van-button>
    </div>

    <div class="user-list">
      <div v-for="user in users" :key="user.id" class="user-item">
        <div class="user-avatar">{{ user.name.charAt(0) }}</div>
        <div class="user-info">
          <div class="user-name">{{ user.name }}</div>
          <div class="user-meta">@{{ user.username }} · {{ user.role === 'ADMIN' ? '管理员' : '普通成员' }}</div>
        </div>
        <div class="user-actions">
          <van-button size="mini" plain @click="openReset(user)">改密码</van-button>
          <van-button size="mini" type="danger" plain @click="deleteUser(user.id)" :disabled="user.id === currentUser.id" style="margin-left:6px">删除</van-button>
        </div>
      </div>
    </div>

    <van-dialog v-model:show="showAddForm" title="新增成员" show-cancel-button @confirm="addUser" confirm-button-color="#2563eb">
      <div style="padding: 16px">
        <van-field v-model="addForm.name" label="姓名" placeholder="显示名称" />
        <van-field v-model="addForm.username" label="账号" placeholder="登录账号" />
        <van-field v-model="addForm.password" type="password" label="密码" placeholder="初始密码" />
        <van-field label="角色" is-link readonly :value="addForm.role === 'ADMIN' ? '管理员' : '普通成员'" @click="showRolePicker = true" />
      </div>
    </van-dialog>

    <van-dialog v-model:show="showResetForm" title="重置密码" show-cancel-button @confirm="resetPassword" confirm-button-color="#2563eb">
      <div style="padding: 16px">
        <van-field v-model="resetForm.password" type="password" label="新密码" placeholder="请输入新密码" />
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
const showAddForm = ref(false)
const showResetForm = ref(false)
const showRolePicker = ref(false)
const editingUserId = ref(null)
const addForm = ref({ name: '', username: '', password: '', role: 'USER' })
const resetForm = ref({ password: '' })

function openAdd() { addForm.value = { name: '', username: '', password: '', role: 'USER' }; showAddForm.value = true }
function openReset(user) { editingUserId.value = user.id; resetForm.value = { password: '' }; showResetForm.value = true }

async function addUser() {
  try {
    await userApi.create(addForm.value)
    showToast({ type: 'success', message: '创建成功' })
    loadUsers()
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
  loadUsers()
}

async function loadUsers() { users.value = await userApi.list() }
onMounted(loadUsers)
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
.user-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.user-item {
  background: white; border-radius: 14px; padding: 14px 16px;
  display: flex; align-items: center; gap: 12px; box-shadow: var(--shadow);
}
.user-avatar {
  width: 44px; height: 44px; border-radius: 50%;
  background: linear-gradient(135deg, #2563eb, #60a5fa);
  color: white; font-size: 18px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.user-info { flex: 1; }
.user-name { font-weight: 600; font-size: 15px; color: var(--text1); }
.user-meta { font-size: 12px; color: var(--text2); margin-top: 2px; }
.user-actions { display: flex; }
</style>
