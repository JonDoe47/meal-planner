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

      <van-tabs v-model:active="activeTab" color="#2563eb" title-active-color="#2563eb" class="login-tabs">
        <van-tab title="密码登录" name="password">
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
        </van-tab>

        <van-tab title="扫码加入" name="qr">
          <div class="qr-section">
            <div v-if="qrStatus === 'WAITING' || qrStatus === 'loading'" class="qr-box">
              <div v-if="qrStatus === 'loading'" class="qr-loading">
                <van-loading color="#2563eb" />
                <p>生成二维码中...</p>
              </div>
              <div v-else>
                <canvas ref="qrCanvas" class="qr-canvas"></canvas>
                <p class="qr-hint">用手机扫描二维码<br>填写姓名申请加入</p>
                <div class="qr-expire">{{ expireText }}</div>
                <van-button plain size="small" @click="generateQr" style="margin-top:8px">刷新二维码</van-button>
              </div>
            </div>
            <div v-else-if="qrStatus === 'SCANNED'" class="qr-status-box scanned">
              <van-icon name="checked" size="48" color="#f59e0b" />
              <p class="qr-status-text">申请已提交</p>
              <p class="qr-status-sub">等待管理员审批...</p>
              <van-loading size="20" color="#f59e0b" style="margin-top:8px" />
            </div>
            <div v-else-if="qrStatus === 'APPROVED'" class="qr-status-box approved">
              <van-icon name="success" size="48" color="#22c55e" />
              <p class="qr-status-text">审批通过！</p>
              <p class="qr-status-sub">正在为您登录...</p>
            </div>
            <div v-else-if="qrStatus === 'EXPIRED'" class="qr-status-box expired">
              <van-icon name="warning-o" size="48" color="#94a3b8" />
              <p class="qr-status-text">二维码已过期</p>
              <van-button type="primary" round size="small" @click="generateQr" style="margin-top:12px">重新生成</van-button>
            </div>
          </div>
        </van-tab>
      </van-tabs>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue'
import { useRouter } from 'vue-router'
import { showToast } from 'vant'
import QRCode from 'qrcode'
import { authApi } from '../api'
import { useAuthStore } from '../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const loading = ref(false)
const form = ref({ username: '', password: '' })
const activeTab = ref('password')

// QR 相关
const qrCanvas = ref(null)
const qrStatus = ref('loading')
const qrToken = ref('')
const qrExpiresAt = ref(null)
let pollTimer = null
let expireTimer = null

const expireText = computed(() => {
  if (!qrExpiresAt.value) return ''
  const diff = Math.max(0, Math.floor((new Date(qrExpiresAt.value) - Date.now()) / 1000))
  const m = Math.floor(diff / 60)
  const s = diff % 60
  return `${m}:${s.toString().padStart(2, '0')} 后过期`
})

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

async function generateQr() {
  clearTimers()
  qrStatus.value = 'loading'
  try {
    const { token, expiresAt } = await authApi.qrGenerate()
    qrToken.value = token
    qrExpiresAt.value = expiresAt
    qrStatus.value = 'WAITING'

    await new Promise(r => setTimeout(r, 50)) // 等待 canvas 渲染
    const url = `${window.location.origin}/register?t=${token}`
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, url, { width: 200, margin: 2 })
    }

    // 开始轮询
    pollTimer = setInterval(pollQrStatus, 2000)
    // 倒计时刷新
    expireTimer = setInterval(() => {
      if (qrExpiresAt.value && new Date(qrExpiresAt.value) <= Date.now()) {
        qrStatus.value = 'EXPIRED'
        clearTimers()
      }
    }, 1000)
  } catch (e) {
    showToast({ type: 'fail', message: '生成二维码失败' })
    qrStatus.value = 'EXPIRED'
  }
}

async function pollQrStatus() {
  if (!qrToken.value) return
  try {
    const { status, token: jwt } = await authApi.qrPoll(qrToken.value)
    qrStatus.value = status
    if (status === 'APPROVED' && jwt) {
      clearTimers()
      // 需要获取用户信息，先解析 JWT payload
      const payload = JSON.parse(atob(jwt.split('.')[1]))
      const user = { id: payload.id, username: payload.username, name: payload.name, role: payload.role }
      auth.login(jwt, user)
      showToast({ type: 'success', message: `欢迎，${user.name}！` })
      setTimeout(() => router.push(user.role === 'ADMIN' ? '/admin' : '/home'), 800)
    } else if (status === 'EXPIRED' || status === 'REJECTED') {
      clearTimers()
    }
  } catch {}
}

function clearTimers() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  if (expireTimer) { clearInterval(expireTimer); expireTimer = null }
}

watch(activeTab, (val) => {
  if (val === 'qr') generateQr()
  else clearTimers()
})

onUnmounted(clearTimers)
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
.login-sub { text-align: center; color: #94a3b8; font-size: 14px; margin-bottom: 16px; }
.login-tabs { margin-bottom: 8px; }
.input-group { margin-bottom: 16px; margin-top: 16px; }
.input-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 6px; padding-left: 2px; }
.login-btn { height: 48px; font-size: 16px; font-weight: 600; margin-top: 24px; background: linear-gradient(90deg, #2563eb, #3b82f6); border: none; }
:deep(.custom-field) {
  border: 1.5px solid #e2e8f0;
  border-radius: 12px;
  overflow: hidden;
}
:deep(.custom-field .van-field__control) { padding: 4px 0; }

.qr-section { padding: 16px 0; display: flex; justify-content: center; }
.qr-box { text-align: center; }
.qr-canvas { border-radius: 12px; border: 1px solid #e2e8f0; display: block; margin: 0 auto; }
.qr-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; color: #64748b; padding: 40px 0; }
.qr-hint { color: #64748b; font-size: 13px; margin-top: 10px; line-height: 1.6; }
.qr-expire { color: #94a3b8; font-size: 12px; margin-top: 6px; }
.qr-status-box { text-align: center; padding: 24px 0; }
.qr-status-text { font-size: 18px; font-weight: 600; color: #1e293b; margin: 12px 0 4px; }
.qr-status-sub { color: #64748b; font-size: 13px; }
</style>
