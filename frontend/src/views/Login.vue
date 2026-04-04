<template>
  <div class="login-page">
    <div class="login-bg">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
      <div class="circle c3"></div>
    </div>
    <div class="login-card">
      <div class="login-logo">🍽️</div>
      <h1 class="login-title">家庭点餐</h1>
      <p class="login-sub">记录每一顿美好的餐食</p>
      <van-form @submit="handleLogin" class="login-form">
        <div class="input-group">
          <div class="input-label">用户名</div>
          <van-field
            v-model="form.username"
            name="username"
            placeholder="请输入用户名"
            :rules="[{ required: true, message: '请填写用户名' }]"
            class="custom-field"
          >
            <template #left-icon><van-icon name="contact" color="#2563eb" /></template>
          </van-field>
        </div>
        <div class="input-group">
          <div class="input-label">密码</div>
          <van-field
            v-model="form.password"
            type="password"
            name="password"
            placeholder="请输入密码"
            :rules="[{ required: true, message: '请填写密码' }]"
            class="custom-field"
          >
            <template #left-icon><van-icon name="lock" color="#2563eb" /></template>
          </van-field>
        </div>
        <van-button
          round block type="primary" native-type="submit"
          :loading="loading" loading-text="登录中..."
          class="login-btn"
        >登录</van-button>
      </van-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import { authApi } from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = ref({ username: '', password: '' })

async function handleLogin() {
  loading.value = true
  try {
    const { token, user } = await authApi.login(form.value)
    auth.login(token, user)
    showToast({ type: 'success', message: `欢迎，${user.name}！` })
    setTimeout(() => router.push(user.role === 'ADMIN' ? '/admin' : '/home'), 500)
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '用户名或密码错误' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.login-bg { position: absolute; inset: 0; }
.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
}
.c1 { width: 300px; height: 300px; top: -80px; right: -60px; }
.c2 { width: 200px; height: 200px; bottom: 60px; left: -60px; }
.c3 { width: 150px; height: 150px; bottom: 200px; right: 40px; }
.login-card {
  background: white;
  border-radius: 24px;
  padding: 40px 28px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.16);
  position: relative;
  z-index: 1;
}
.login-logo { text-align: center; font-size: 56px; margin-bottom: 12px; }
.login-title { text-align: center; font-size: 26px; font-weight: 700; color: #1e293b; margin-bottom: 6px; }
.login-sub { text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 32px; }
.input-group { margin-bottom: 16px; }
.input-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; padding-left: 2px; }
.login-btn { height: 48px; font-size: 16px; font-weight: 600; margin-top: 24px; background: linear-gradient(90deg, #2563eb, #3b82f6); border: none; }
:deep(.custom-field) {
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
:deep(.custom-field .van-field__control) { padding: 4px 0; }
</style>
