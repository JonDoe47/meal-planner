<template>
  <div class="register-page">
    <div class="reg-bg">
      <div class="circle c1"></div>
      <div class="circle c2"></div>
    </div>
    <div class="register-card">
      <div class="logo">🍽️</div>
      <h2 class="title">加入家庭点餐</h2>
      <p class="sub">填写你的姓名，等待管理员审批后即可使用</p>

      <div v-if="step === 'form'" class="form-area">
        <div class="form-group">
          <van-field
            v-model="name"
            label="你的姓名"
            placeholder="请输入姓名（如：爸爸、妈妈）"
            :disabled="submitting"
            class="name-field"
          />
        </div>
        <van-button
          round block type="primary"
          :loading="submitting" loading-text="提交中..."
          class="submit-btn"
          @click="submit"
        >申请加入</van-button>
      </div>

      <div v-else-if="step === 'success'" class="result-box">
        <div class="success-icon">✅</div>
        <p class="result-title">申请已提交！</p>
        <p class="result-sub">管理员审批后，即可开始使用家庭点餐系统</p>
      </div>

      <div v-else-if="step === 'error'" class="result-box">
        <div class="error-icon">⚠️</div>
        <p class="result-title">出现错误</p>
        <p class="result-sub">{{ errorMsg }}</p>
        <van-button plain round size="small" @click="step = 'form'" style="margin-top:16px">重试</van-button>
      </div>

      <div v-else-if="step === 'invalid'" class="result-box">
        <div class="error-icon">🔗</div>
        <p class="result-title">二维码无效或已过期</p>
        <p class="result-sub">请让管理员刷新二维码后重新扫码</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { showToast } from 'vant'
import { authApi } from '../api'

const route = useRoute()
const token = route.query.t
const name = ref('')
const step = ref('form')
const submitting = ref(false)
const errorMsg = ref('')

onMounted(() => {
  if (!token) step.value = 'invalid'
})

async function submit() {
  if (!name.value.trim()) {
    showToast({ type: 'fail', message: '请填写姓名' })
    return
  }
  submitting.value = true
  try {
    await authApi.qrRegister({ token, name: name.value.trim() })
    step.value = 'success'
  } catch (e) {
    if (e.message?.includes('无效') || e.message?.includes('过期') || e.message?.includes('使用')) {
      step.value = 'invalid'
    } else {
      errorMsg.value = e.message || '提交失败'
      step.value = 'error'
    }
  } finally {
    submitting.value = false
  }
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  background: linear-gradient(160deg, #1e40af 0%, #2563eb 35%, #3b82f6 65%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  position: relative;
  overflow: hidden;
}
.reg-bg { position: absolute; inset: 0; }
.circle {
  position: absolute; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  animation: float 8s ease-in-out infinite;
}
.c1 { width: 280px; height: 280px; top: -80px; left: -60px; animation-delay: -2s; }
.c2 { width: 180px; height: 180px; bottom: 30px; right: -50px; animation-delay: -4s; }
@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.07; }
  50% { transform: translateY(-16px) scale(1.05); opacity: 0.11; }
}

.register-card {
  background: white; border-radius: var(--radius-xl);
  padding: 36px 28px 32px; width: 100%; max-width: 380px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.1) inset;
  position: relative; z-index: 1;
  animation: cardIn 0.45s ease-out both;
}
@keyframes cardIn {
  from { opacity: 0; transform: translateY(20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}

.logo { text-align: center; font-size: 48px; margin-bottom: 10px; animation: popIn 0.5s ease-out 0.15s both; }
@keyframes popIn {
  from { opacity: 0; transform: scale(0.4) rotate(-10deg); }
  to   { opacity: 1; transform: scale(1) rotate(0); }
}
.title { text-align: center; font-size: 22px; font-weight: 800; color: var(--text1); margin-bottom: 6px; }
.sub { color: var(--text2); font-size: 14px; line-height: 1.6; margin-bottom: 24px; text-align: center; }

.form-area { }
.form-group { margin-bottom: 8px; text-align: left; }
.name-field {
  border: 1.5px solid var(--border); border-radius: var(--radius-md); overflow: hidden;
  transition: all 0.2s ease; background: var(--bg);
}
.name-field:focus-within {
  border-color: var(--primary); background: white;
  box-shadow: 0 0 0 3px rgba(37,99,235,0.10);
}
.submit-btn {
  height: 48px; font-size: 16px; font-weight: 700; margin-top: 20px;
  background: linear-gradient(135deg, #2563eb, #3b82f6);
  border: none; box-shadow: 0 4px 14px rgba(37,99,235,0.35);
  transition: all 0.25s;
}
.submit-btn:active { transform: scale(0.98); }

.result-box { padding: 20px 0; animation: celebrateIn 0.45s ease-out; }
@keyframes celebrateIn {
  from { opacity: 0; transform: scale(0.85); }
  to   { opacity: 1; transform: scale(1); }
}
.success-icon { text-align: center; font-size: 56px; margin-bottom: 12px; animation: bounceIn 0.5s ease-out 0.2s both; }
.error-icon { text-align: center; font-size: 48px; margin-bottom: 12px; }
@keyframes bounceIn {
  0% { transform: scale(0.3); opacity: 0; }
  50% { transform: scale(1.1); }
  70% { transform: scale(0.9); }
  100% { transform: scale(1); opacity: 1; }
}
.result-title { font-size: 20px; font-weight: 700; color: var(--text1); margin: 14px 0 6px; text-align: center; }
.result-sub { color: var(--text2); font-size: 14px; line-height: 1.6; text-align: center; }
</style>