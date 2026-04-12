<template>
  <div class="my-orders">
    <div class="page-header">
      <div class="header-left">
        <div class="header-title">我的记录</div>
        <div class="header-sub">{{ auth.user?.name }}</div>
      </div>
      <van-button size="small" plain @click="handleLogout" class="logout-btn">退出</van-button>
    </div>

    <div class="filter-card">
      <div class="filter-row" @click="showStart = true">
        <van-icon name="calendar-o" color="#2563eb" />
        <span class="filter-label">开始</span>
        <span class="filter-val">{{ startDate }}</span>
      </div>
      <div class="filter-divider">→</div>
      <div class="filter-row" @click="showEnd = true">
        <van-icon name="calendar-o" color="#2563eb" />
        <span class="filter-label">结束</span>
        <span class="filter-val">{{ endDate }}</span>
      </div>
    </div>

    <van-popup v-model:show="showStart" position="bottom" round>
      <van-date-picker v-model="startPicker" @confirm="v => { startDate = v.selectedValues.join('-'); showStart = false; loadPlans() }" @cancel="showStart = false" />
    </van-popup>
    <van-popup v-model:show="showEnd" position="bottom" round>
      <van-date-picker v-model="endPicker" @confirm="v => { endDate = v.selectedValues.join('-'); showEnd = false; loadPlans() }" @cancel="showEnd = false" />
    </van-popup>

    <transition-group name="order-list" tag="div" class="plans-list" v-if="groupedPlans.length > 0">
      <div v-for="group in groupedPlans" :key="group.date" class="date-group">
        <div class="date-label">
          <span class="date-dot"></span>{{ group.date }}
        </div>
        <transition-group name="plan-card-anim" tag="div" :key="'cards'+group.date">
          <div v-for="plan in group.plans" :key="plan.id" class="plan-card">
            <div class="plan-header">
              <div class="meal-badge" :class="plan.mealType.toLowerCase()">{{ mealTypeLabel(plan.mealType) }}</div>
              <van-button size="mini" type="danger" plain @click="deletePlan(plan.id)">取消</van-button>
            </div>
            <div class="plan-dishes">
              <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain class="plan-tag">{{ item.dish.name }}</van-tag>
            </div>
          </div>
        </transition-group>
      </div>
    </transition-group>
    <van-empty v-else description="暂无点餐记录" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showConfirmDialog, showToast } from 'vant'
import { mealApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const auth = useAuthStore()
const plans = ref([])
const showStart = ref(false)
const showEnd = ref(false)

const today = new Date()
const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7)
const startDate = ref(weekAgo.toISOString().split('T')[0])
const endDate = ref(nextWeek.toISOString().split('T')[0])
const startPicker = ref(startDate.value.split('-'))
const endPicker = ref(endDate.value.split('-'))

const groupedPlans = computed(() => {
  const map = {}
  for (const plan of plans.value) {
    if (!map[plan.date]) map[plan.date] = []
    map[plan.date].push(plan)
  }
  return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([date, ps]) => ({ date, plans: ps }))
})

function mealTypeLabel(t) { return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[t] || t }

async function loadPlans() { plans.value = await mealApi.list({ startDate: startDate.value, endDate: endDate.value }) }
async function deletePlan(id) {
  await showConfirmDialog({ title: '确认', message: '确定取消这个点餐吗？' })
  await mealApi.delete(id)
  showToast({ type: 'success', message: '已取消' })
  loadPlans()
}
function handleLogout() { auth.logout(); router.push('/login') }
onMounted(loadPlans)
</script>

<style scoped>
.my-orders { padding-bottom: 60px; background: var(--bg); min-height: 100vh; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center; color: white;
}
.header-title { font-size: 18px; font-weight: 800; }
.header-sub { font-size: 12px; opacity: 0.85; margin-top: 2px; font-weight: 500; }
.logout-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; font-weight: 600; }

.filter-card {
  margin: var(--space-lg);
  background: white; border-radius: var(--radius-md);
  padding: 4px 0; box-shadow: var(--shadow); display: flex;
}
.filter-row { display: flex; align-items: center; gap: 8px; flex: 1; cursor: pointer; padding: 12px 16px; transition: background 0.15s; border-radius: var(--radius-sm); }
.filter-row:hover { background: var(--bg); }
.filter-label { font-size: 12px; color: var(--text2); font-weight: 600; width: 28px; flex-shrink: 0; }
.filter-val { flex: 1; font-size: 13px; font-weight: 700; color: var(--text1); text-align: right; }
.filter-divider { color: var(--border); margin: 0 4px; }

.plans-list { padding: 0 var(--space-lg) var(--space-xl); }
.date-group { margin-bottom: var(--space-xl); }
.date-label {
  font-size: 14px; font-weight: 800; color: var(--primary); margin-bottom: var(--space-sm);
  padding-left: 4px; display: flex; align-items: center; gap: 6px;
}
.date-dot { width: 8px; height: 8px; border-radius: 50%; background: var(--primary); flex-shrink: 0; }
.plan-card {
  background: white; border-radius: var(--radius-md); padding: 12px 14px;
  margin-bottom: 8px; box-shadow: var(--shadow);
  transition: transform 0.2s; border: 1px solid transparent;
}
.plan-card:hover { border-color: #bfdbfe; transform: translateX(4px); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.meal-badge { padding: 4px 12px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; }
.plan-dishes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.plan-tag { margin: 0 !important; transition: transform 0.15s; }
.plan-tag:hover { transform: scale(1.04); }

/* 列表动画 */
.order-list-enter-active { transition: all 0.35s ease-out; }
.order-list-enter-from { opacity: 0; transform: translateY(16px); }
.plan-card-anim-move { transition: transform 0.3s ease; }
</style>