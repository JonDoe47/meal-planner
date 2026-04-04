<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-logo">🍽️</div>
      <h1 class="login-title">家庭点餐</h1>
      <p class="login-sub">欢迎回来</p>
      <van-form @submit="handleLogin">
        <van-cell-group inset>
          <van-field v-model="form.username" name="username" label="用户名" placeholder="请输入用户名" :rules="[{ required: true, message: '请填写用户名' }]" />
          <van-field v-model="form.password" type="password" name="password" label="密码" placeholder="请输入密码" :rules="[{ required: true, message: '请填写密码' }]" />
        </van-cell-group>
        <div style="margin: 20px 16px 0">
          <van-button round block type="primary" native-type="submit" :loading="loading" loading-text="登录中...">登录</van-button>
        </div>
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
    showToast({ type: 'fail', message: e.message || '登录失败' })
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #ff6b35 0%, #f7931e 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.login-card {
  background: white;
  border-radius: 20px;
  padding: 40px 0 30px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.login-logo { text-align: center; font-size: 60px; margin-bottom: 10px; }
.login-title { text-align: center; font-size: 24px; font-weight: 700; color: #333; margin-bottom: 4px; }
.login-sub { text-align: center; color: #999; font-size: 14px; margin-bottom: 30px; }
</style>
