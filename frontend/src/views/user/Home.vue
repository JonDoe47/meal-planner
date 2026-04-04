<template>
  <div class="home">
    <div class="header">
      <div>
        <div class="greeting">你好，{{ auth.user?.name }} 👋</div>
        <div class="date-text">{{ todayText }}</div>
      </div>
      <van-button v-if="auth.isAdmin" size="small" type="primary" @click="$router.push('/admin')">管理后台</van-button>
    </div>

    <div class="week-card">
      <div class="week-title">本周餐单</div>
      <div class="week-days">
        <div
          v-for="day in weekDays"
          :key="day.date"
          class="day-item"
          :class="{ active: day.date === selectedDate }"
          @click="selectedDate = day.date"
        >
          <div class="day-name">{{ day.label }}</div>
          <div class="day-date">{{ day.short }}</div>
          <div class="day-dot" :class="{ has: dayHasMeal(day.date) }"></div>
        </div>
      </div>
    </div>

    <div class="meal-section" v-if="selectedDatePlans.length > 0">
      <div v-for="plan in selectedDatePlans" :key="plan.id" class="meal-card">
        <div class="meal-type-tag">{{ mealTypeLabel(plan.mealType) }}</div>
        <div class="meal-dishes">
          <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain style="margin: 2px">{{ item.dish.name }}</van-tag>
        </div>
      </div>
    </div>
    <van-empty v-else description="今天还没有安排，去点餐吧~" image="food">
      <van-button type="primary" round @click="$router.push('/order')">去点餐</van-button>
    </van-empty>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { mealApi } from '../../api'

const auth = useAuthStore()
const plans = ref([])
const selectedDate = ref('')

const today = new Date()
const todayText = computed(() => {
  return today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })
})

function getWeekDays() {
  const days = []
  const weekLabels = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i)
    const dateStr = d.toISOString().split('T')[0]
    days.push({ date: dateStr, label: '周' + weekLabels[d.getDay()], short: `${d.getMonth()+1}/${d.getDate()}` })
  }
  return days
}

const weekDays = getWeekDays()
selectedDate.value = today.toISOString().split('T')[0]

const selectedDatePlans = computed(() => plans.value.filter(p => p.date === selectedDate.value))

function dayHasMeal(date) { return plans.value.some(p => p.date === date) }

function mealTypeLabel(type) {
  return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[type] || type
}

async function loadPlans() {
  const start = weekDays[0].date
  const end = weekDays[6].date
  plans.value = await mealApi.list({ startDate: start, endDate: end })
}

onMounted(loadPlans)
</script>

<style scoped>
.home { padding: 0 0 20px; }
.header { display: flex; justify-content: space-between; align-items: center; padding: 20px 16px 16px; background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; }
.greeting { font-size: 20px; font-weight: 700; }
.date-text { font-size: 13px; opacity: 0.85; margin-top: 4px; }
.week-card { background: white; margin: 12px; border-radius: 12px; padding: 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.week-title { font-weight: 600; margin-bottom: 12px; color: #333; }
.week-days { display: flex; gap: 8px; overflow-x: auto; }
.day-item { flex: 1; min-width: 44px; text-align: center; padding: 8px 4px; border-radius: 10px; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.day-item.active { border-color: #ff6b35; background: #fff5f0; }
.day-name { font-size: 12px; color: #666; }
.day-date { font-size: 13px; font-weight: 600; margin: 4px 0; }
.day-dot { width: 6px; height: 6px; border-radius: 50%; background: #ddd; margin: 0 auto; }
.day-dot.has { background: #ff6b35; }
.meal-section { padding: 0 12px; }
.meal-card { background: white; border-radius: 12px; padding: 14px; margin-bottom: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.meal-type-tag { font-weight: 600; color: #ff6b35; margin-bottom: 8px; }
</style>
