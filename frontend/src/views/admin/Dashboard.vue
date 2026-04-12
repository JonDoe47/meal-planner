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
      <div class="stat-card stat-blue" @click="$router.push('/admin/dishes')">
        <div class="stat-icon-wrap"><span class="stat-emoji">🍳</span></div>
        <div class="stat-num">{{ stats.dishCount }}</div>
        <div class="stat-label">菜品总数</div>
        <div class="stat-arrow">→</div>
      </div>
      <div class="stat-card stat-green" @click="$router.push('/admin/users')">
        <div class="stat-icon-wrap"><span class="stat-emoji">👨‍👩‍👧</span></div>
        <div class="stat-num">{{ stats.userCount }}</div>
        <div class="stat-label">家庭成员</div>
        <div class="stat-arrow">→</div>
      </div>
      <div class="stat-card stat-orange" @click="$router.push('/admin/orders')">
        <div class="stat-icon-wrap"><span class="stat-emoji">📋</span></div>
        <div class="stat-num">{{ stats.todayOrders }}</div>
        <div class="stat-label">今日点餐</div>
        <div class="stat-arrow">→</div>
      </div>
      <div class="stat-card stat-red" :class="{ 'pulse': stats.pendingRequests > 0 }" @click="$router.push('/admin/dish-requests')">
        <div class="stat-icon-wrap"><span class="stat-emoji">💬</span></div>
        <div class="stat-num" :class="{ highlight: stats.pendingRequests > 0 }">{{ stats.pendingRequests }}</div>
        <div class="stat-label">待处理需求</div>
        <div class="stat-arrow">→</div>
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

    <!-- 可视化看板 -->
    <div class="charts-section">
      <div class="section-title">数据看板</div>
      <div class="charts-grid">
        <div class="chart-card">
          <div class="chart-title">🥗 分类菜品分布</div>
          <v-chart class="chart" :option="pieOption" autoresize />
        </div>
        <div class="chart-card">
          <div class="chart-title">📈 近7天点餐趋势</div>
          <v-chart class="chart" :option="lineOption" autoresize />
        </div>
        <div class="chart-card">
          <div class="chart-title">🔥 热门菜品 Top5</div>
          <v-chart class="chart" :option="barTopOption" autoresize />
        </div>
        <div class="chart-card">
          <div class="chart-title">⭐ 评价分布</div>
          <v-chart class="chart" :option="barRatingOption" autoresize />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'
import { dishApi, userApi, mealApi, dishRequestApi, statsApi } from '../../api'
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { PieChart, LineChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import VChart from 'vue-echarts'

use([CanvasRenderer, PieChart, LineChart, BarChart, GridComponent, TooltipComponent, LegendComponent, TitleComponent])

const auth = useAuthStore()
const router = useRouter()
const stats = ref({ dishCount: 0, userCount: 0, todayOrders: 0, pendingRequests: 0 })
const chartData = ref({ categoryDist: [], trend: { dates: [], counts: [] }, topDishes: [], ratingDist: [0, 0, 0, 0, 0] })

function logout() { auth.logout(); router.push('/login') }

const pieOption = computed(() => ({
  tooltip: { trigger: 'item', formatter: '{b}: {c}道 ({d}%)' },
  legend: { orient: 'horizontal', bottom: 0, textStyle: { fontSize: 11 }, itemWidth: 10, itemHeight: 10 },
  series: [{
    type: 'pie', radius: ['40%', '70%'],
    center: ['50%', '45%'],
    data: chartData.value.categoryDist,
    label: { show: false },
    itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 }
  }]
}))

const lineOption = computed(() => ({
  tooltip: { trigger: 'axis' },
  grid: { top: 12, right: 12, bottom: 28, left: 40 },
  xAxis: {
    type: 'category',
    data: chartData.value.trend.dates.map(d => d.slice(5)),
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    axisLine: { lineStyle: { color: '#e2e8f0' } },
    axisTick: { show: false }
  },
  yAxis: {
    type: 'value', minInterval: 1,
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    axisLine: { show: false }
  },
  series: [{
    type: 'line', data: chartData.value.trend.counts,
    smooth: true, symbol: 'circle', symbolSize: 7,
    lineStyle: { color: '#3b82f6', width: 3 },
    itemStyle: { color: '#3b82f6', borderColor: '#fff', borderWidth: 2 },
    areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(59,130,246,0.18)' }, { offset: 1, color: 'rgba(59,130,246,0.02)' }] } }
  }]
}))

const barTopOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 12, right: 20, bottom: 4, left: 4, containLabel: true },
  xAxis: { type: 'value', axisLabel: { fontSize: 10, color: '#94a3b8' }, splitLine: { show: false }, axisLine: { show: false } },
  yAxis: {
    type: 'category', data: chartData.value.topDishes.map(d => d.name),
    axisLabel: { fontSize: 11, width: 60, overflow: 'truncate', color: '#1e293b', fontWeight: 600 },
    axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }
  },
  series: [{
    type: 'bar', data: chartData.value.topDishes.map(d => d.count),
    itemStyle: {
      color: (params) => ({ type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [{ offset: 0, color: 'rgba(139,92,246,0.65)' }, { offset: 1, color: 'rgba(139,92,246,1)' }] }),
      borderRadius: [0, 6, 6, 0]
    },
    label: { show: true, position: 'right', fontSize: 11, fontWeight: 700, color: '#64748b' },
    barMaxWidth: 20
  }]
}))

const barRatingOption = computed(() => ({
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  grid: { top: 16, right: 12, bottom: 28, left: 40 },
  xAxis: {
    type: 'category', data: ['1星', '2星', '3星', '4星', '5星'],
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    axisLine: { lineStyle: { color: '#e2e8f0' } }, axisTick: { show: false }
  },
  yAxis: {
    type: 'value', minInterval: 1,
    axisLabel: { fontSize: 11, color: '#94a3b8' },
    splitLine: { lineStyle: { color: '#f1f5f9', type: 'dashed' } },
    axisLine: { show: false }
  },
  series: [{
    type: 'bar', data: chartData.value.ratingDist,
    itemStyle: {
      borderRadius: [6, 6, 0, 0],
      color: (params) => {
        const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#2563eb']
        return colors[params.dataIndex] || '#f59e0b'
      }
    },
    label: { show: true, position: 'top', fontSize: 11, fontWeight: 700, color: '#64748b' },
    barMaxWidth: 32
  }]
}))

onMounted(async () => {
  const today = new Date().toISOString().split('T')[0]
  const [dishes, users, orders, requests, overview] = await Promise.all([
    dishApi.list(), userApi.list(),
    mealApi.list({ startDate: today, endDate: today }),
    dishRequestApi.list(),
    statsApi.overview()
  ])
  stats.value = {
    dishCount: dishes.length,
    userCount: users.length,
    todayOrders: orders.length,
    pendingRequests: requests.filter(r => r.status === 'PENDING').length
  }
  chartData.value = overview
})
</script>

<style scoped>
.dashboard { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.dash-header {
  background: linear-gradient(135deg, #1d4ed8, #3b82f6);
  padding: var(--space-xl); display: flex;
  justify-content: space-between; align-items: center; color: white;
}
.dash-title { font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
.dash-sub { font-size: 13px; opacity: 0.85; margin-top: 4px; font-weight: 500; }
.header-actions { display: flex; gap: 8px; }
.header-btn { background: rgba(255,255,255,0.18); border-color: rgba(255,255,255,0.35); color: white; font-weight: 600; transition: all 0.2s; }
.header-btn:hover { background: rgba(255,255,255,0.28); }

/* 统计卡片 */
.stats-grid {
  display: grid; grid-template-columns: repeat(2, 1fr);
  gap: 12px; padding: var(--space-xl) var(--space-lg) var(--space-md);
}
.stat-card {
  background: white; border-radius: var(--radius-lg);
  padding: 18px 14px;
  text-align: center; box-shadow: var(--shadow);
  cursor: pointer; position: relative;
  overflow: hidden; transition: all 0.25s ease;
  border: 2px solid transparent;
}
.stat-card::before {
  content: ''; position: absolute; inset: 0; opacity: 0.08; z-index: 0;
}
.stat-card:active { transform: scale(0.96); }
.stat-card:hover { transform: translateY(-3px); box-shadow: var(--shadow-lg); }
.stat-card.stat-blue { border-color: #dbeafe; } .stat-blue::before { background: linear-gradient(135deg, #3b82f6, #60a5fa); }
.stat-card.stat-green { border-color: #dcfce7; } .stat-green::before { background: linear-gradient(135deg, #22c55e, #4ade80); }
.stat-card.stat-orange { border-color: #ffedd5; } .stat-orange::before { background: linear-gradient(135deg, #f97316, #fb923c); }
.stat-card.stat-red { border-color: #fee2e2; } .stat-red::before { background: linear-gradient(135deg, #ef4444, #f87171); }
.stat-card.pulse .stat-num { animation: pulse-glow 2s ease-in-out infinite; }
@keyframes pulse-glow { 0%,100% { opacity: 1; } 50% { opacity: 0.7; text-shadow: 0 0 8px rgba(239,68,68,0.4); } }

.stat-icon-wrap { position: relative; z-index: 1; }
.stat-emoji { font-size: 30px; display: inline-block; transition: transform 0.25s; }
.stat-card:hover .stat-emoji { transform: scale(1.15) rotate(-5deg); }
.stat-num { font-size: 28px; font-weight: 800; color: var(--primary); position: relative; z-index: 1; margin: 8px 0 2px; }
.stat-num.highlight { color: #ef4444; }
.stat-label { font-size: 12px; color: '#64748b'; position: relative; z-index: 1; font-weight: 600; }
.stat-arrow {
  position: absolute; right: 12px; bottom: 12px; z-index: 1;
  font-size: 18px; color: var(--border-light);
  transition: all 0.2s; opacity: 0; font-weight: 300;
}
.stat-card:hover .stat-arrow { opacity: 0.4; transform: translateX(4px); }

/* 快捷操作 */
.quick-section { padding: 4px var(--space-lg); }
.section-title { font-size: 16px; font-weight: 800; color: '#1e293b'; margin-bottom: 14px; letter-spacing: -0.3px; }
.quick-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.quick-item {
  background: white; border-radius: var(--radius-lg); padding: 16px 8px;
  text-align: center; box-shadow: var(--shadow); cursor: pointer;
  transition: all 0.25s; position: relative; overflow: hidden;
}
.quick-item::after {
  content: ''; position: absolute; inset: 0; opacity: 0; transition: opacity 0.25s;
  background: linear-gradient(135deg, transparent, rgba(37,99,235,0.04));
}
.quick-item:hover { transform: translateY(-3px); box-shadow: var(--shadow-md); }
.quick-item:hover::after { opacity: 1; }
.quick-item:active { transform: scale(0.96); }
.quick-icon { width: 46px; height: 46px; border-radius: 14px; margin: 0 auto 8px; display: flex; align-items: center; justify-content: center; font-size: 22px; transition: transform 0.25s; }
.quick-item:hover .quick-icon { transform: scale(1.1) rotate(-5deg); }
.quick-icon.blue { background: linear-gradient(135deg, #eff6ff, #bfdbfe); }
.quick-icon.green { background: linear-gradient(135deg, #f0fdf4, #bbf7d0); }
.quick-icon.purple { background: linear-gradient(135deg, #faf5ff, #ddd6fe); }
.quick-icon.orange { background: linear-gradient(135deg, #fff7ed, #fed7aa); }
.quick-icon.yellow { background: linear-gradient(135deg, #fefce8, #fef08a); }
.quick-icon.gray { background: linear-gradient(135deg, #f8fafc, #e2e8f0); }
.quick-label { font-size: 13px; font-weight: 700; color: '#1e293b'; position: relative; z-index: 1; }
.quick-badge {
  position: absolute; top: 8px; right: 8px; z-index: 1;
  background: linear-gradient(135deg, #ef4444, #f87171); color: white;
  font-size: 11px; font-weight: 800; border-radius: 10px;
  min-width: 18px; height: 20px; display: flex; align-items: center; justify-content: center;
  padding: 0 6px;
}

/* 图表区 */
.charts-section { padding: 4px var(--space-lg) var(--space-xl); }
.charts-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.chart-card {
  background: white; border-radius: var(--radius-lg);
  padding: 12px 10px 8px; box-shadow: var(--shadow);
  border: 1px solid var(--border-light); transition: box-shadow 0.2s;
}
.chart-card:hover { box-shadow: var(--shadow-md); }
.chart-title { font-size: 13px; font-weight: 700; color: '#64748b'; margin-bottom: 6px; text-align: center; }
.chart { height: 180px; }
</style>