<template>
  <div class="dashboard">
    <div class="admin-header">
      <div>
        <div class="admin-title">管理后台</div>
        <div class="admin-sub">你好，{{ auth.user?.name }}</div>
      </div>
      <div>
        <van-button size="small" plain @click="$router.push('/home')" style="margin-right:8px;color:white;border-color:white">用户端</van-button>
        <van-button size="small" plain @click="logout" style="color:white;border-color:white">退出</van-button>
      </div>
    </div>
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-num">{{ stats.dishCount }}</div>
        <div class="stat-label">菜品总数</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ stats.categoryCount }}</div>
        <div class="stat-label">分类数量</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ stats.userCount }}</div>
        <div class="stat-label">家庭成员</div>
      </div>
      <div class="stat-card">
        <div class="stat-num">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日点餐</div>
      </div>
    </div>
    <div class="quick-actions">
      <div class="section-title">快捷操作</div>
      <van-grid :column-num="2" :border="false">
        <van-grid-item icon="add-o" text="新增菜品" @click="$router.push('/admin/dishes')" />
        <van-grid-item icon="apps-o" text="管理分类" @click="$router.push('/admin/categories')" />
        <van-grid-item icon="orders-o" text="查看点餐" @click="$router.push('/admin/orders')" />
        <van-grid-item icon="friends-o" text="管理成员" @click="$router.push('/admin/users')" />
      </van-grid>
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
    dishApi.list(),
    categoryApi.list(),
    userApi.list(),
    mealApi.list({ startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0] })
  ])
  stats.value = { dishCount: dishes.length, categoryCount: cats.length, userCount: users.length, todayOrders: orders.length }
})
</script>

<style scoped>
.dashboard { padding-bottom: 20px; }
.admin-header { background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px 16px; display: flex; justify-content: space-between; align-items: center; }
.admin-title { font-size: 20px; font-weight: 700; }
.admin-sub { font-size: 13px; opacity: 0.85; margin-top: 4px; }
.stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; padding: 16px; }
.stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.stat-num { font-size: 32px; font-weight: 700; color: #667eea; }
.stat-label { font-size: 13px; color: #999; margin-top: 4px; }
.quick-actions { padding: 0 16px; }
.section-title { font-weight: 700; font-size: 16px; margin-bottom: 12px; }
</style>
