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
                placeholder="请输入用户名（4-20位字母/数字/下划线）"
                :rules="usernameRules"
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
                placeholder="请输入密码（8-32位，含字母和数字）"
                :rules="passwordRules"
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

const usernameRules = [
  { required: true, message: '请填写用户名' },
  { validator: v => v.length >= 4, message: '用户名至少4个字符' },
  { validator: v => v.length <= 20, message: '用户名最多20个字符' },
  { validator: v => /^[a-zA-Z_][a-zA-Z0-9_]{3,19}$/.test(v), message: '用户名只能含字母、数字、下划线，且不能以数字开头' }
]

const passwordRules = [
  { required: true, message: '请填写密码' },
  { validator: v => v.length >= 8, message: '密码至少8个字符' },
  { validator: v => v.length <= 32, message: '密码最多32个字符' },
  { validator: v => /(?=.*[A-Za-z])(?=.*\d)/.test(v), message: '密码必须同时包含字母和数字' }
]

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

    await new Promise(r => setTimeout(r, 50))
    const url = `${window.location.origin}/register?t=${token}`
    if (qrCanvas.value) {
      await QRCode.toCanvas(qrCanvas.value, url, { width: 200, margin: 2 })
    }

    pollTimer = setInterval(pollQrStatus, 2000)
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
  background: linear-gradient(160deg, #1e40af 0%, #2563eb 35%, #3b82f6 65%, #60a5fa 100%);
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
  background: rgba(255,255,255,0.07);
  animation: float 8s ease-in-out infinite;
}
.c1 { width: 340px; height: 340px; top: -100px; right: -80px; animation-delay: 0s; }
.c2 { width: 220px; height: 220px; bottom: 40px; left: -80px; animation-delay: -3s; }
.c3 { width: 170px; height: 170px; bottom: 220px; right: 30px; animation-delay: -5s; }
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.07; }
  50% { transform: translateY(-20px) scale(1.05); opacity: 0.12; }
}
.login-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 36px 28px 32px;
  width: 100%;
  max-width: 400px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.1) inset;
  position: relative;
  z-index: 1;
  animation: cardIn 0.5s ease-out both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(24px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.login-logo { text-align: center; font-size: 52px; margin-bottom: 10px; animation: logoBounce 0.6s ease-out 0.2s both; }
@keyframes logoBounce {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}
.login-title { text-align: center; font-size: var(--text-xxl); font-weight: 800; color: var(--text1); margin-bottom: 4px; letter-spacing: -0.3px; }
.login-sub { text-align: center; color: var(--text2); font-size: var(--text-sm); margin-bottom: 16px; }
.login-tabs { margin-bottom: 4px; }
.input-group { margin-bottom: 14px; margin-top: 14px; }
.input-label { font-size: var(--text-sm); font-weight: 600; color: #475569; margin-bottom: 6px; padding-left: 2px; display: block; }
.login-btn {
  height: 48px; font-size: 16px; font-weight: 700;
  margin-top: 22px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border: none; box-shadow: 0 4px 14px rgba(37,99,235,0.35);
  transition: all 0.25s;
}
.login-btn:active { transform: scale(0.98); box-shadow: 0 2px 8px rgba(37,99,235,0.3); }

::deep(.custom-field) {
  border: 1.5px solid var(--border);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: all 0.2s ease;
  background: var(--bg);
}
::deep(.custom-field:focus-within) {
  border-color: var(--primary);
  background: white;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
}
::deep(.custom-field .van-field__control) { padding: 4px 0; }

/* 二维码区域 */
.qr-section { padding: 12px 0; display: flex; justify-content: center; }
.qr-box { text-align: center; animation: fadeInUp 0.3s ease-out; }
@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}
.qr-canvas {
  border-radius: var(--radius-md);
  border: 2px solid var(--border);
  display: block; margin: 0 auto;
  box-shadow: var(--shadow-sm);
  transition: transform 0.3s;
}
.qr-canvas:hover { transform: scale(1.02); }
.qr-loading { display: flex; flex-direction: column; align-items: center; gap: 12px; color: var(--text2); padding: 36px 0; }
.qr-hint { color: var(--text2); font-size: 13px; margin-top: 10px; line-height: 1.6; }
.qr-expire { color: var(--text3); font-size: 12px; margin-top: 6px; }
.qr-status-box { text-align: center; padding: 28px 0; animation: statusPop 0.35s ease-out; }
@keyframes statusPop {
  from { opacity: 0; transform: scale(0.9); }
  to   { opacity: 1; transform: scale(1); }
}
.qr-status-box.scanned .qr-status-text { color: var(--warm-amber); }
.qr-status-box.approved .qr-status-text { color: var(--success-green); }
.qr-status-text { font-size: 18px; font-weight: 700; color: var(--text1); margin: 14px 0 4px; }
.qr-status-sub { color: var(--text2); font-size: 13px; line-height: 1.5; }

/* 成功态庆祝 */
.result-box { padding: 20px 0; animation: celebrateIn 0.45s ease-out; }
@keyframes celebrateIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
</style>