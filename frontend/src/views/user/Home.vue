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
        <div class="week-nav">
          <div class="week-nav-btn" @click="weekOffset--">‹</div>
          <span class="week-title">{{ weekTitle }}</span>
          <div class="week-nav-btn" @click="weekOffset++">›</div>
        </div>
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
    <transition name="meal-fade" mode="out-in">
      <div :key="selectedDate" class="meals-section">
        <div class="section-title">{{ selectedDate === todayDate ? '今日餐单' : selectedDate + ' 餐单' }}</div>
        <template v-if="selectedDatePlans.length > 0">
          <transition-group name="meal-list" tag="div" class="meal-cards">
            <div v-for="plan in selectedDatePlans" :key="plan.id" class="meal-card">
              <div class="meal-card-left">
                <div class="meal-type-badge" :class="plan.mealType.toLowerCase()">{{ mealTypeLabel(plan.mealType) }}</div>
              </div>
              <div class="meal-dishes">
                <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain class="dish-tag">{{ item.dish.name }}</van-tag>
              </div>
            </div>
          </transition-group>
        </template>
        <div v-else class="empty-state">
          <div class="empty-illustration">🍳</div>
          <div class="empty-text">今天还没有安排</div>
          <van-button type="primary" round size="small" @click="$router.push('/order')">立即点餐</van-button>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useAuthStore } from '../../stores/auth'
import { mealApi } from '../../api'

const auth = useAuthStore()
const plans = ref([])
const today = new Date()
const todayDate = today.toISOString().split('T')[0]
const selectedDate = ref(todayDate)
const weekOffset = ref(0)

const todayText = computed(() => today.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }))

const weekDays = computed(() => {
  const weekLabels = ['日','一','二','三','四','五','六']
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today)
    d.setDate(today.getDate() - today.getDay() + i + weekOffset.value * 7)
    const dateStr = d.toISOString().split('T')[0]
    return { date: dateStr, label: '周' + weekLabels[d.getDay()], num: d.getDate(), isToday: dateStr === todayDate }
  })
})

const weekTitle = computed(() => {
  if (weekOffset.value === 0) return '本周餐单'
  if (weekOffset.value === -1) return '上周餐单'
  if (weekOffset.value === 1) return '下周餐单'
  return weekOffset.value > 0 ? `后${weekOffset.value}周` : `前${-weekOffset.value}周`
})

const selectedDatePlans = computed(() => plans.value.filter(p => p.date === selectedDate.value))
function dayHasMeal(date) { return plans.value.some(p => p.date === date) }
function mealTypeLabel(type) { return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[type] || type }

async function loadWeekPlans() {
  plans.value = await mealApi.list({ startDate: weekDays.value[0].date, endDate: weekDays.value[6].date })
}

watch(weekOffset, () => {
  if (!weekDays.value.some(d => d.date === selectedDate.value)) {
    selectedDate.value = weekOffset.value === 0 ? todayDate : weekDays.value[0].date
  }
  loadWeekPlans()
})

onMounted(loadWeekPlans)
</script>

<style scoped>
.home { min-height: 100vh; background: var(--bg); }
.header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-xl) var(--space-lg);
  display: flex; justify-content: space-between;
  align-items: flex-start; color: white;
}
.greeting { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.date-text { font-size: 12px; opacity: 0.85; font-weight: 500; }
.admin-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; font-weight: 600; }

.week-card {
  background: white; margin: -12px var(--space-lg) 0;
  border-radius: var(--radius-lg); padding: var(--space-lg);
  box-shadow: var(--shadow-md); position: relative; z-index: 1;
}
.week-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-lg); }
.week-nav { display: flex; align-items: center; gap: 8px; }
.week-title { font-weight: 700; font-size: var(--text-base); color: var(--text1); }
.week-nav-btn {
  width: 22px; height: 22px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
  font-size: 17px; color: var(--primary); cursor: pointer; background: var(--primary-light);
  font-weight: 700; line-height: 1; transition: all 0.2s; user-select: none;
}
.week-nav-btn:hover { background: var(--primary-mid); }
.week-nav-btn:active { transform: scale(0.88); }
.week-days { display: flex; gap: 4px; }
.day-item {
  flex: 1; text-align: center; padding: 8px 2px;
  border-radius: var(--radius-sm); cursor: pointer;
  transition: all 0.25s ease; border: 2px solid transparent; position: relative;
}
.day-item.active { background: var(--primary-light); border-color: var(--primary); transform: translateY(-2px); }
.day-item.today .day-num { color: var(--primary); font-weight: 700; }
.day-name { font-size: 11px; color: var(--text2); margin-bottom: 4px; font-weight: 600; }
.day-num { font-size: 14px; font-weight: 600; color: var(--text1); margin-bottom: 5px; }
.day-dot { width: 5px; height: 5px; border-radius: 50%; background: var(--border-light); margin: 0 auto; transition: all 0.3s; }
.day-dot.has { background: linear-gradient(135deg, #2563eb, #3b82f6); box-shadow: 0 0 6px rgba(37,99,235,0.3); }

.meals-section { padding: var(--space-xl) var(--space-lg) var(--space-2xl); }
.section-title { font-size: 16px; font-weight: 700; color: var(--text1); margin-bottom: var(--space-md); }
.meal-cards { display: flex; flex-direction: column; gap: 10px; }
.meal-card {
  background: white; border-radius: var(--radius-md); padding: var(--space-md);
  display: flex; align-items: flex-start; gap: var(--space-md);
  box-shadow: var(--shadow); transition: transform 0.2s;
}
.meal-card:active { transform: scale(0.98); }
.meal-type-badge {
  padding: 4px 10px; border-radius: var(--radius-full);
  font-size: 12px; font-weight: 700; white-space: nowrap; letter-spacing: 0.5px;
}
.meal-dishes { flex: 1; display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.dish-tag { margin: 0 !important; font-size: 13px !important; transition: transform 0.15s; }
.dish-tag:hover { transform: scale(1.03); }

.empty-state {
  text-align: center; padding: 40px 20px; background: white;
  border-radius: var(--radius-lg); box-shadow: var(--shadow);
  border: 2px dashed var(--border);
}
.empty-illustration { font-size: 48px; margin-bottom: 14px; animation: gentleBounce 2s ease-in-out infinite; }
@keyframes gentleBounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}
.empty-text { color: var(--text2); margin-bottom: 16px; font-size: 14px; }

/* 餐单切换过渡 */
.meal-fade-enter-active, .meal-fade-leave-active { transition: opacity 0.2s ease, transform 0.2s ease; }
.meal-fade-enter-from { opacity: 0; transform: translateY(8px); }
.meal-fade-leave-to { opacity: 0; transform: translateY(-8px); }

/* 菜品列表动画 */
.meal-list-enter-active { transition: all 0.3s ease-out; }
.meal-list-enter-from { opacity: 0; transform: translateX(-16px); }
</style>