<template>
  <div class="home">
    <!-- 顶部 Header -->
    <div class="header">
      <div class="header-left">
        <div class="greeting">你好，{{ auth.user?.name }} 👋</div>
        <div class="date-text">{{ todayText }}</div>
      </div>
      <van-button v-if="auth.isAdmin" size="small" @click="$router.push('/admin')" class="admin-btn">
        管理后台
      </van-button>
    </div>

    <!-- 本周日历 -->
    <div class="week-card">
      <div class="week-header">
        <span class="week-title">本周餐单</span>
        <van-button size="mini" type="primary" plain @click="$router.push('/order')">去点餐</van-button>
      </div>
      <div class="week-days">
        <div
          v-for="day in weekDays" :key="day.date"
          class="day-item" :class="{ active: day.date === selectedDate, today: day.isToday }"
          @click="selectedDate = day.date"
        >
          <div class="day-name">{{ day.label }}</div>
          <div class="day-num">{{ day.num }}</div>
          <div class="day-dot" :class="{ has: dayHasMeal(day.date) }"></div>
        </div>
      </div>
    </div>

    <!-- 当天餐单 -->
    <div class="meals-section">
      <div class="section-title">{{ selectedDate === todayDate ? '今日餐单' : selectedDate + ' 餐单' }}</div>
      <div v-if="selectedDatePlans.length > 0" class="meal-cards">
        <div v-for="plan in selectedDatePlans" :key="plan.id" class="meal-card">
          <div class="meal-card-left">
            <div class="meal-type-badge" :class="plan.mealType.toLowerCase()">{{ mealTypeLabel(plan.mealType) }}</div>
          </div>
          <div class="meal-dishes">
            <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain style="margin: 3px; font-size: 13px;">{{ item.dish.name }}</van-tag>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">
        <div class="empty-icon">🍽️</div>
        <div class="empty-text">今天还没有安排</div>
        <van-button type="primary" round size="small" @click="$router.push('/order')">立即点餐</van-button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { mealApi } from '../../api'

const auth = useAuthStore()
const plans = ref([])
const today = new Date()
const todayDate = today.toISOString().split('T')[0]
const selectedDate = ref(todayDate)

const todayText = computed(() => today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))

function getWeekDays() {
  const weekLabels = ['日','一','二','三','四','五','六']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, label: '周' + weekLabels[d.getDay()], num: d.getDate(), isToday: dateStr === todayDate }
  })
}

const weekDays = getWeekDays()
const selectedDatePlans = computed(() => plans.value.filter(p => p.date === selectedDate.value))
function dayHasMeal(date) { return plans.value.some(p => p.date === date) }
function mealTypeLabel(type) { return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[type] || type }

onMounted(async () => {
  plans.value = await mealApi.list({ startDate: weekDays[0].date, endDate: weekDays[6].date })
})
</script>

<style scoped>
.home { min-height: 100vh; background: var(--bg); }
.header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: 20px 20px 24px;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  color: white;
}
.greeting { font-size: 20px; font-weight: 700; margin-bottom: 4px; }
.date-text { font-size: 12px; opacity: 0.8; }
.admin-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; }

.week-card {
  background: white;
  margin: -12px 16px 0;
  border-radius: 16px;
  padding: 16px;
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 1;
}
.week-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.week-title { font-weight: 700; font-size: 15px; color: var(--text1); }
.week-days { display: flex; gap: 4px; }
.day-item {
  flex: 1;
  text-align: center;
  padding: 8px 2px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  border: 2px solid transparent;
}
.day-item.active { background: var(--primary-light); border-color: var(--primary); }
.day-item.today .day-num { color: var(--primary); font-weight: 700; }
.day-name { font-size: 11px; color: var(--text2); margin-bottom: 4px; }
.day-num { font-size: 14px; font-weight: 600; color: var(--text1); margin-bottom: 5px; }
.day-dot { width: 5px; height: 5px; border-radius: 50%; background: #e2e8f0; margin: 0 auto; }
.day-dot.has { background: var(--primary); }

.meals-section { padding: 20px 16px; }
.section-title { font-size: 16px; font-weight: 700; color: var(--text1); margin-bottom: 12px; }
.meal-cards { display: flex; flex-direction: column; gap: 10px; }
.meal-card {
  background: white;
  border-radius: 12px;
  padding: 14px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-shadow: var(--shadow);
}
.meal-type-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}
.meal-type-badge.breakfast { background: #fef3c7; color: #d97706; }
.meal-type-badge.lunch { background: #dcfce7; color: #16a34a; }
.meal-type-badge.dinner { background: #ede9fe; color: #7c3aed; }
.meal-dishes { flex: 1; }
.empty-state { text-align: center; padding: 40px 20px; background: white; border-radius: 16px; box-shadow: var(--shadow); }
.empty-icon { font-size: 48px; margin-bottom: 12px; }
.empty-text { color: var(--text2); margin-bottom: 16px; }
</style>
