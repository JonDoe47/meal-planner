<template>
  <div class="request-page">
    <div class="page-header">
      <div class="header-title">我要求菜</div>
      <div class="header-sub">告诉管理员你想吃什么</div>
    </div>

    <!-- 提交表单 -->
    <div class="form-card">
      <div class="form-card-title">💡 提交新需求</div>
      <div class="field-item">
        <div class="field-label">想吃的菜 <span class="req">*</span></div>
        <van-field v-model="form.dishName" placeholder="例如：红烧肉、土豆炖鸡..." class="f-input" :class="{ error: nameError }" />
        <div class="err-msg" v-if="nameError">请填写菜品名称</div>
      </div>
      <div class="field-item">
        <div class="field-label">补充说明（可选）</div>
        <van-field v-model="form.description" type="textarea" placeholder="口味偏好、做法要求..." rows="3" class="f-input" />
      </div>
      <van-button type="primary" round block :loading="submitting" @click="submit" class="submit-btn">提交需求</van-button>
    </div>

    <!-- 我的需求列表 -->
    <transition-group name="req-anim" tag="div" class="my-list">
      <div v-for="req in myList" :key="req.id" class="req-card" :class="'status-' + req.status.toLowerCase()">
        <div class="req-top">
          <div class="req-name">{{ req.dishName }}</div>
          <div class="req-status">{{ statusLabel(req.status) }}</div>
        </div>
        <div class="req-desc" v-if="req.description">{{ req.description }}</div>
        <div class="req-note" v-if="req.adminNote">
          <van-icon name="comment-o" size="12" color="#2563eb" />
          <span>管理员回复：{{ req.adminNote }}</span>
        </div>
        <div class="req-time">{{ formatTime(req.createdAt) }}</div>
      </div>
    </transition-group>

    <van-empty v-if="myList.length === 0 && !submitting" description="还没有提交过需求" />
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
    form.value = { dishName: '', description: '' }; await load()
  } catch (e) { showToast({ type: 'fail', message: e.message || '提交失败' }) }
  finally { submitting.value = false }
}

async function load() { myList.value = await dishRequestApi.list() }
onMounted(load)
</script>

<style scoped>
.request-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); color: white;
}
.header-title { font-size: 18px; font-weight: 800; letter-spacing: -0.3px; }
.header-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; font-weight: 500; }

.form-card { margin: var(--space-md); background: white; border-radius: var(--radius-lg); padding: var(--space-lg); box-shadow: var(--shadow-md); border-top: 4px solid var(--warm-amber); }
.form-card-title { font-size: 15px; font-weight: 700; color: var(--text1); margin-bottom: 16px; display: flex; align-items: center; gap: 6px; }
.field-item { margin-bottom: 16px; }
.field-label { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 8px; display: flex; gap: 4px; }
.req { color: #ef4444; font-weight: 800; }
.err-msg { font-size: 12px; color: #ef4444; margin-top: 6px; font-weight: 500; }

.f-input { background: var(--bg); border-radius: var(--radius-sm); border: 1.5px solid var(--border); transition: all 0.2s; }
.f-input:focus-within { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(37,99,235,0.08); background: white; }
.f-input.error { border-color: #ef4444; }

.submit-btn { height: 48px; font-size: 15px; font-weight: 800; background: linear-gradient(135deg, #2563eb, #3b82f6); border: none; box-shadow: 0 4px 14px rgba(37,99,235,0.32); transition: all 0.25s; }
.submit-btn:active { transform: scale(0.98); }

.my-list { padding: 0 var(--space-md); position: relative; z-index: 0; }
.section-title { font-size: 15px; font-weight: 700; color: var(--text1); margin-bottom: 10px; }

.req-anim-move { transition: transform 0.35s ease; }
.req-anim-enter-active { transition: all 0.25s ease-out; }
.req-anim-enter-from { opacity: 0; transform: translateY(10px); }

.req-card {
  background: white; border-radius: var(--radius-md); padding: 14px;
  box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 8px;
  border-left: 3px solid transparent; transition: all 0.2s;
}
.req-card:hover { box-shadow: var(--shadow-md); transform: translateX(4px); }
.req-card.status-pending { border-left-color: #f59e0b; background: linear-gradient(135deg, #fffbeb, #fef3c7); }
.req-card.status-approved { border-left-color: #22c55e; background: linear-gradient(135deg, #f0fdf4, #dcfce7); }
.req-card.status-rejected { border-left-color: #ef4444; background: linear-gradient(135deg, #fef2f2, #fee2e2); }
.req-top { display: flex; justify-content: space-between; align-items: center; }
.req-name { font-size: 16px; font-weight: 800; color: var(--text1); letter-spacing: -0.2px; }
.req-status {
  font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: var(--radius-full);
  white-space: nowrap; flex-shrink: 0; letter-spacing: 0.5px;
}
.req-desc { font-size: 13px; color: var(--text2); line-height: 1.55; word-break: break-word; }
.req-note {
  display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--primary);
  background: #eff6ff; border-radius: var(--radius-sm); padding: 7px 10px;
  font-weight: 500;
}
.req-time { font-size: 11px; color: var(--text3); font-weight: 500; }
</style>