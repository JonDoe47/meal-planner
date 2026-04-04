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
        <div class="stat-icon">📂</div>
        <div class="stat-num">{{ stats.categoryCount }}</div>
        <div class="stat-label">分类数量</div>
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
    </div>

    <div class="quick-section">
      <div class="section-title">快捷操作</div>
      <div class="quick-grid">
        <div class="quick-item" @click="$router.push('/admin/dishes')">
          <div class="quick-icon blue">🍽️</div>
          <div class="quick-label">菜品管理</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/categories')">
          <div class="quick-icon green">📂</div>
          <div class="quick-label">分类管理</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/orders')">
          <div class="quick-icon purple">📊</div>
          <div class="quick-label">点餐统计</div>
        </div>
        <div class="quick-item" @click="$router.push('/admin/users')">
          <div class="quick-icon orange">👥</div>
          <div class="quick-label">成员管理</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { dishApi, categoryApi, userApi, mealApi } from '../../api'

const auth = useAuthStore()
const router = useRouter()
const stats = ref({ dishCount: 0, categoryCount: 0, userCount: 0, todayOrders: 0 })

function logout() { auth.logout(); router.push('/login') }

onMounted(async () => {
  const [dishes, cats, users, orders] = await Promise.all([
    dishApi.list(), categoryApi.list(), userApi.list(),
    mealApi.list({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] })
  ])
  stats.value = { dishCount: dishes.length, categoryCount: cats.length, userCount: users.length, todayOrders: orders.length }
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
  text-align: center; box-shadow: var(--shadow);
}
.stat-icon { font-size: 28px; margin-bottom: 8px; }
.stat-num { font-size: 28px; font-weight: 700; color: var(--primary); }
.stat-label { font-size: 12px; color: var(--text2); margin-top: 4px; }
.quick-section { padding: 12px 16px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text1); margin-bottom: 12px; }
.quick-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.quick-item {
  background: white; border-radius: 16px; padding: 20px 16px;
  text-align: center; box-shadow: var(--shadow); cursor: pointer;
  transition: transform 0.15s;
}
.quick-item:active { transform: scale(0.97); }
.quick-icon { width: 48px; height: 48px; border-radius: 14px; margin: 0 auto 10px; display: flex; align-items: center; justify-content: center; font-size: 24px; }
.quick-icon.blue { background: #eff6ff; }
.quick-icon.green { background: #f0fdf4; }
.quick-icon.purple { background: #faf5ff; }
.quick-icon.orange { background: #fff7ed; }
.quick-label { font-size: 14px; font-weight: 600; color: var(--text1); }
</style>
