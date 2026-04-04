<template>
  <div class="register-page">
    <div class="register-card">
      <div class="logo">🍽️</div>
      <h2 class="title">加入家庭点餐</h2>
      <p class="sub">填写你的姓名，等待管理员审批后即可使用</p>

      <div v-if="step === 'form'">
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
        <van-icon name="checked" size="64" color="#22c55e" />
        <p class="result-title">申请已提交！</p>
        <p class="result-sub">管理员审批后，请在电脑端刷新登录页面即可自动登录。</p>
      </div>

      <div v-else-if="step === 'error'" class="result-box">
        <van-icon name="warning-o" size="64" color="#ef4444" />
        <p class="result-title">出现错误</p>
        <p class="result-sub">{{ errorMsg }}</p>
        <van-button plain round size="small" @click="step = 'form'" style="margin-top:16px">重试</van-button>
      </div>

      <div v-else-if="step === 'invalid'" class="result-box">
        <van-icon name="warning-o" size="64" color="#94a3b8" />
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
  background: linear-gradient(160deg, #1d4ed8 0%, #3b82f6 50%, #60a5fa 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.register-card {
  background: white;
  border-radius: 24px;
  padding: 40px 28px 32px;
  width: 100%;
  max-width: 380px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.16);
  text-align: center;
}
.logo { font-size: 56px; margin-bottom: 12px; }
.title { font-size: 22px; font-weight: 700; color: #1e293b; margin-bottom: 8px; }
.sub { color: #64748b; font-size: 14px; line-height: 1.6; margin-bottom: 28px; }
.form-group { margin-bottom: 8px; text-align: left; }
.name-field { border: 1.5px solid #e2e8f0; border-radius: 12px; overflow: hidden; }
.submit-btn { height: 48px; font-size: 16px; font-weight: 600; margin-top: 20px; background: linear-gradient(90deg, #2563eb, #3b82f6); border: none; }
.result-box { padding: 16px 0; }
.result-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 16px 0 8px; }
.result-sub { color: #64748b; font-size: 14px; line-height: 1.6; }
</style>
