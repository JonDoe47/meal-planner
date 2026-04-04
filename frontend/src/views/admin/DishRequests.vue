<template>
  <div class="requests-page">
    <div class="page-header">
      <div class="header-title">求菜需求</div>
      <div class="header-count">待处理 {{ pendingCount }} 条</div>
    </div>

    <!-- 筛选标签 -->
    <van-tabs v-model:active="activeTab" color="#2563eb" line-width="24px" sticky offset-top="54">
      <van-tab title="全部待处理" name="PENDING" />
      <van-tab title="已通过" name="APPROVED" />
      <van-tab title="已拒绝" name="REJECTED" />
    </van-tabs>

    <div class="list-wrap">
      <div v-if="filteredList.length === 0" class="empty-wrap">
        <van-empty :description="activeTab === 'PENDING' ? '暂无待处理需求' : '暂无记录'" />
      </div>

      <div v-for="req in filteredList" :key="req.id" class="req-card">
        <div class="req-top">
          <div class="req-info">
            <div class="req-name">{{ req.dishName }}</div>
            <div class="req-meta">
              <span class="req-user">{{ req.user.name }}</span>
              <span class="req-time">{{ formatTime(req.createdAt) }}</span>
            </div>
            <div class="req-desc" v-if="req.description">{{ req.description }}</div>
          </div>
          <div class="req-status" :class="req.status.toLowerCase()">{{ statusLabel(req.status) }}</div>
        </div>

        <div class="req-note" v-if="req.adminNote">
          <van-icon name="info-o" size="12" color="#64748b" />
          <span>{{ req.adminNote }}</span>
        </div>

        <div class="req-actions" v-if="req.status === 'PENDING'">
          <van-field
            v-model="noteMap[req.id]"
            placeholder="备注（可选，如：下周加入菜单）"
            class="note-input"
            size="small"
          />
          <div class="btn-row">
            <van-button size="small" type="success" @click="handle(req.id, 'APPROVED')">通过</van-button>
            <van-button size="small" type="danger" plain @click="handle(req.id, 'REJECTED')">拒绝</van-button>
          </div>
        </div>
      </div>
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
  } catch {
    showToast({ type: 'fail', message: '操作失败' })
  }
}

async function load() {
  list.value = await dishRequestApi.list()
}

onMounted(load)
</script>

<style scoped>
.requests-page { min-height: 100vh; background: var(--bg); padding-bottom: 80px; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 16px 20px;
  display: flex; justify-content: space-between; align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.header-count { font-size: 13px; opacity: 0.8; }

.list-wrap { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.empty-wrap { padding: 40px 0; }

.req-card {
  background: white; border-radius: 14px; padding: 14px;
  box-shadow: var(--shadow); display: flex; flex-direction: column; gap: 10px;
}
.req-top { display: flex; justify-content: space-between; align-items: flex-start; }
.req-info { flex: 1; min-width: 0; }
.req-name { font-size: 16px; font-weight: 700; color: var(--text1); margin-bottom: 4px; }
.req-meta { display: flex; gap: 8px; align-items: center; margin-bottom: 4px; }
.req-user { font-size: 12px; color: var(--primary); font-weight: 600; }
.req-time { font-size: 11px; color: var(--text2); }
.req-desc { font-size: 13px; color: var(--text2); }

.req-status {
  font-size: 12px; font-weight: 600;
  padding: 3px 10px; border-radius: 20px; white-space: nowrap; flex-shrink: 0;
}
.req-status.pending { background: #fef3c7; color: #d97706; }
.req-status.approved { background: #dcfce7; color: #16a34a; }
.req-status.rejected { background: #fee2e2; color: #ef4444; }

.req-note {
  display: flex; align-items: center; gap: 5px;
  font-size: 12px; color: #64748b;
  background: #f8fafc; border-radius: 8px; padding: 6px 10px;
}

.note-input { background: #f8fafc; border-radius: 8px; border: 1.5px solid var(--border); }
.btn-row { display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end; }
</style>
