<template>
  <div class="dashboard">
    <div class="dash-header">
      <div>
        <div class="dash-title">管理后台</div>
        <div class="dash-sub">你好，{{ auth.user?.name }}</div>
      </div>
      <div class="header-actions">
        <van-button size="small" plain @click="$router.push('/home')" class="header-btn">用户端</van-button>
        <van-button size="small" plain @click="logout" class="header-btn">退出</van-button>
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon">🍳</div>
        <div class="stat-num">{{ stats.dishCount }}</div>
        <div class="stat-label">菜品总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">👨‍👩‍👧</div>
        <div class="stat-num">{{ stats.userCount }}</div>
        <div class="stat-label">家庭成员</div>
      </div>
      <div class="stat-card">
        <div class="stat-icon">📋</div>
        <div class="stat-num">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日点餐</div>
      </div>
      <div class="stat-card pending" @click="$router.push('/admin/dish-requests')">
        <div class="stat-icon">💬</div>
        <div class="stat-num" :class="{ highlight: stats.pendingRequests > 0 }">{{ stats.pendingRequests }}</div>
        <div class="stat-label">待处理需求</div>
      </div>
    </div>

    <div class="quick-section">
      <div class="section-title">快捷操作</div>
      <div class="quick-grid">
        <div class="quick-item" @click="$router.push('/admin/dishes')">
          <div class="quick-icon blue">🍽️</div>
          <div class="quick-label">菜品管理</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/dish-requests')">
          <div class="quick-icon yellow">💬</div>
          <div class="quick-label">求菜需求</div>
          <div class="quick-badge" v-if="stats.pendingRequests > 0">{{ stats.pendingRequests }}</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/ingredients')">
          <div class="quick-icon green">🛒</div>
          <div class="quick-label">食材清单</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/orders')">
          <div class="quick-icon purple">📊</div>
          <div class="quick-label">点餐统计</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/users')">
          <div class="quick-icon orange">👥</div>
          <div class="quick-label">成员管理</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/categories')">
          <div class="quick-icon gray">📂</div>
          <div class="quick-label">分类管理</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { dishApi, userApi, mealApi, dishRequestApi } from '../../api'

const auth = useAuthStore()
const router = useRouter()
const stats = ref({ dishCount: 0, userCount: 0, todayOrders: 0, pendingRequests: 0 })

function logout() { auth.logout(); router.push('/login') }

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]
  const [dishes, users, orders, requests] = await Promise.all([
    dishApi.list(), userApi.list(),
    mealApi.list({ startDate: today, endDate: today }),
    dishRequestApi.list()
  ])
  stats.value = {
    dishCount: dishes.length,
    userCount: users.length,
    todayOrders: orders.length,
    pendingRequests: requests.filter(r => r.status === 'PENDING').length
  }
})
</script>

<style scoped>
.dashboard { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.dash-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}
.dash-title { font-size: 20px; font-weight: 700; }
.dash-sub { font-size: 13px; opacity: 0.8; margin-top: 4px; }
.header-actions { display: flex; gap: 8px; }
.header-btn { background: rgba(255,255,255,0.15); border-color: rgba(255,255,255,0.3); color: white; }

.stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 12px; padding: 20px 16px 8px;
}
.stat-card {
  background: white; border-radius: 16px; padding: 20px 16px;
  text-align: center; box-shadow: var(--shadow); cursor: default;
}
.stat-card.pending { cursor: pointer; }
.stat-icon { font-size: 28px; margin-bottom: 8px; }
.stat-num { font-size: 28px; font-weight: 700; color: var(--primary); }
.stat-num.highlight { color: #ef4444; }
.stat-label { font-size: 12px; color: var(--text2); margin-top: 4px; }

.quick-section { padding: 12px 16px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text1); margin-bottom: 12px; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.quick-item {
  background: white; border-radius: 16px; padding: 16px 8px;
  text-align: center; box-shadow: var(--shadow); cursor: pointer;
  transition: transform 0.15s; position: relative;
}
.quick-item:active { transform: scale(0.97); }
.quick-icon { width: 44px; height: 44px; border-radius: 12px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 22px; }
.quick-icon.blue { background: #eff6ff; }
.quick-icon.green { background: #f0fdf4; }
.quick-icon.purple { background: #faf5ff; }
.quick-icon.orange { background: #fff7ed; }
.quick-icon.yellow { background: #fefce8; }
.quick-icon.gray { background: #f8fafc; }
.quick-label { font-size: 13px; font-weight: 600; color: var(--text1); }
.quick-badge {
  position: absolute; top: 8px; right: 8px;
  background: #ef4444; color: white;
  font-size: 11px; font-weight: 700;
  border-radius: 10px; padding: 1px 6px;
  min-width: 18px;
}
</style>
