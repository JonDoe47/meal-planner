<template>
  <div class="request-page">
    <div class="page-header">
      <div class="header-title">我要求菜</div>
      <div class="header-sub">告诉管理员你想吃什么</div>
    </div>

    <!-- 提交表单 -->
    <div class="form-card">
      <div class="form-card-title">提交新需求</div>
      <div class="field-item">
        <div class="field-label">想吃的菜 <span class="req">*</span></div>
        <van-field v-model="form.dishName" placeholder="例如：红烧肉、土豆炖鸡..." class="f-input" :class="{ error: nameError }" />
        <div class="err-msg" v-if="nameError">请填写菜品名称</div>
      </div>
      <div class="field-item">
        <div class="field-label">补充说明（可选）</div>
        <van-field v-model="form.description" type="textarea" placeholder="口味偏好、做法要求..." rows="3" class="f-input" />
      </div>
      <van-button type="primary" round block :loading="submitting" @click="submit" style="height:46px;font-size:15px;font-weight:600;">提交需求</van-button>
    </div>

    <!-- 我的需求列表 -->
    <div class="my-list">
      <div class="section-title">我的求菜记录</div>
      <van-empty v-if="myList.length === 0" description="还没有提交过需求" />
      <div v-for="req in myList" :key="req.id" class="req-card">
        <div class="req-top">
          <div class="req-name">{{ req.dishName }}</div>
          <div class="req-status" :class="req.status.toLowerCase()">{{ statusLabel(req.status) }}</div>
        </div>
        <div class="req-desc" v-if="req.description">{{ req.description }}</div>
        <div class="req-note" v-if="req.adminNote">
          <van-icon name="comment-o" size="12" color="#2563eb" />
          <span>管理员回复：{{ req.adminNote }}</span>
        </div>
        <div class="req-time">{{ formatTime(req.createdAt) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { showToast } from 'vant'
import { dishRequestApi } from '../../api'

const form = ref({ dishName: '', description: '' })
const nameError = ref(false)
const submitting = ref(false)
const myList = ref([])

function statusLabel(s) { return { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已拒绝' }[s] || s }

function formatTime(t) {
  const d = new Date(t)
  return `${d.getFullYear()}/${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

async function submit() {
  nameError.value = !form.value.dishName.trim()
  if (nameError.value) { showToast({ type: 'fail', message: '请填写菜品名称' }); return }
  submitting.value = true
  try {
    await dishRequestApi.create({ dishName: form.value.dishName.trim(), description: form.value.description })
    showToast({ type: 'success', message: '需求已提交！等待管理员处理' })
    form.value = { dishName: '', description: '' }
    await load()
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '提交失败' })
  } finally { submitting.value = false }
}

async function load() {
  myList.value = await dishRequestApi.list()
}

onMounted(load)
</script>

<style scoped>
.request-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.header-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }

.form-card { margin: 12px; background: white; border-radius: 16px; padding: 16px; box-shadow: var(--shadow-md); }
.form-card-title { font-size: 15px; font-weight: 700; color: var(--text1); margin-bottom: 16px; }
.field-item { margin-bottom: 14px; }
.field-label { font-size: 13px; font-weight: 600; color: #475569; margin-bottom: 8px; }
.req { color: #ef4444; }
.err-msg { font-size: 12px; color: #ef4444; margin-top: 4px; }
.f-input { background: var(--bg); border-radius: 10px; border: 1.5px solid var(--border); }
.f-input.error { border-color: #ef4444; }

.my-list { padding: 0 12px; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text1); margin-bottom: 10px; }

.req-card {
  background: white; border-radius: 14px; padding: 14px;
  box-shadow: var(--shadow); margin-bottom: 10px;
  display: flex; flex-direction: column; gap: 6px;
}
.req-top { display: flex; justify-content: space-between; align-items: center; }
.req-name { font-size: 15px; font-weight: 700; color: var(--text1); }
.req-desc { font-size: 13px; color: var(--text2); }
.req-status {
  font-size: 12px; font-weight: 600; padding: 2px 10px; border-radius: 20px;
}
.req-status.pending { background: #fef3c7; color: #d97706; }
.req-status.approved { background: #dcfce7; color: #16a34a; }
.req-status.rejected { background: #fee2e2; color: #ef4444; }
.req-note { display: flex; align-items: center; gap: 5px; font-size: 12px; color: #2563eb; }
.req-time { font-size: 11px; color: #94a3b8; }
</style>
