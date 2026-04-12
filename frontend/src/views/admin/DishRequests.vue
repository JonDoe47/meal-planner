<template>
  <div class="requests-page">
    <div class="page-header">
      <div class="header-title">求菜需求</div>
      <div class="header-count" :class="{ hasPending: pendingCount > 0 }">待处理 {{ pendingCount }} 条</div>
    </div>

    <van-tabs v-model:active="activeTab" color="#2563eb" line-width="24px" sticky offset-top="54">
      <van-tab title="全部待处理" name="PENDING" />
      <van-tab title="已通过" name="APPROVED" />
      <van-tab title="已拒绝" name="REJECTED" />
    </van-tabs>

    <div class="list-wrap">
      <div v-if="filteredList.length === 0" class="empty-wrap">
        <van-empty :description="activeTab === 'PENDING' ? '暂无待处理需求' : '暂无记录'" />
      </div>

      <transition-group name="req-anim" tag="div">
      <div v-for="req in filteredList" :key="req.id" class="req-card">
        <div class="req-top">
          <div class="req-info">
            <div class="req-name">{{ req.dishName }}</div>
            <div class="req-meta">
              <span class="req-user"><van-icon name="contact" size="12" /> {{ req.user.name }}</span>
              <span class="req-time">{{ formatTime(req.createdAt) }}</span>
            </div>
            <div class="req-desc" v-if="req.description">{{ req.description }}</div>
          </div>
          <div class="req-status" :class="'status-' + req.status.toLowerCase()">{{ statusLabel(req.status) }}</div>
        </div>

        <div class="req-note" v-if="req.adminNote">
          <van-icon name="comment-o" size="12" color="#64748b" />
          <span>管理员回复：{{ req.adminNote }}</span>
        </div>

        <div class="req-actions" v-if="req.status === 'PENDING'">
          <van-field v-model="noteMap[req.id]" placeholder="备注（可选，如：下周加入菜单）" class="note-input" size="small" />
          <div class="btn-row">
            <van-button size="small" type="success" @click="handle(req.id, 'APPROVED')">通过</van-button>
            <van-button size="small" type="danger" plain @click="handle(req.id, 'REJECTED')">拒绝</van-button>
          </div>
        </div>
      </div>
      </transition-group>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { dishRequestApi } from '../../api'

const list = ref([])
const activeTab = ref('PENDING')
const noteMap = ref({})

const filteredList = computed(() => list.value.filter(r => r.status === activeTab.value))
const pendingCount = computed(() => list.value.filter(r => r.status === 'PENDING').length)

function statusLabel(s) { return { PENDING: '待处理', APPROVED: '已通过', REJECTED: '已拒绝' }[s] || s }

function formatTime(t) {
  const d = new Date(t)
  return `${d.getMonth()+1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

async function handle(id, status) {
  try {
    await dishRequestApi.handle(id, { status, adminNote: noteMap.value[id] || '' })
    showToast({ type: 'success', message: status === 'APPROVED' ? '已通过' : '已拒绝' })
    await load()
  } catch { showToast({ type: 'fail', message: '操作失败' }) }
}

async function load() { list.value = await dishRequestApi.list() }
onMounted(load)
</script>

<style scoped>
.requests-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center; color: white; flex-shrink: 0;
}
.header-title { font-size: 18px; font-weight: 800; }
.header-count { font-size: 13px; opacity: 0.85; font-weight: 500; transition: all 0.25s; }
.header-count.hasPending { color: #fef08a; animation: blink 1.5s ease-in-out infinite; }
@keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }

.list-wrap { padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; position: relative; z-index: 0; }
.empty-wrap { padding: 40px 0; }

.req-anim-move { transition: transform 0.35s ease; }
.req-anim-enter-active { transition: all 0.3s ease-out; }
.req-anim-enter-from { opacity: 0; transform: translateY(12px); }

.req-card {
  background: white; border-radius: var(--radius-md); padding: 14px;
  box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px;
  border-left: 3px solid transparent; transition: all 0.2s;
}
.req-card:hover { border-color: var(--primary-mid); box-shadow: var(--shadow-md); }
.req-top { display: flex; justify-content: space-between; align-items: flex-start; }
.req-info { flex: 1; min-width: 0; }
.req-name { font-size: 16px; font-weight: 800; color: var(--text1); margin-bottom: 6px; letter-spacing: -0.3px; }
.req-meta { display: flex; gap: 10px; align-items: center; margin-bottom: 6px; }
.req-user { font-size: 12px; color: var(--primary); font-weight: 600; display: flex; align-items: center; gap: 4px; background: #eff6ff; padding: 2px 8px; border-radius: 10px; }
.req-time { font-size: 11px; color: var(--text3); font-weight: 500; }
.req-desc { font-size: 13px; color: var(--text2); line-height: 1.55; word-break: break-word; }

.req-status { font-size: 12px; font-weight: 700; padding: 3px 12px; border-radius: var(--radius-full); white-space: nowrap; flex-shrink: 0; letter-spacing: 0.5px; }

.req-note {
  display: flex; align-items: center; gap: 6px;
  font-size: 12px; color: #64748b;
  background: #f8fafc; border-radius: var(--radius-sm); padding: 8px 10px;
  border: 1px solid var(--border-light);
}

.note-input { background: white; border-radius: var(--radius-sm); border: 1.5px solid var(--border); }
.btn-row { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
</style>