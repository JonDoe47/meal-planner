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

    <div class="plans-list" v-if="groupedPlans.length > 0">
      <div v-for="group in groupedPlans" :key="group.date" class="date-group">
        <div class="date-label">{{ group.date }}</div>
        <div v-for="plan in group.plans" :key="plan.id" class="plan-card">
          <div class="plan-header">
            <div class="meal-badge" :class="plan.mealType.toLowerCase()">{{ mealTypeLabel(plan.mealType) }}</div>
            <van-button size="mini" type="danger" plain @click="deletePlan(plan.id)">取消</van-button>
          </div>
          <div class="plan-dishes">
            <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain style="margin:3px">{{ item.dish.name }}</van-tag>
          </div>
        </div>
      </div>
    </div>
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
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.header-sub { font-size: 12px; opacity: 0.8; margin-top: 2px; }
.logout-btn { background: rgba(255,255,255,0.2); border-color: rgba(255,255,255,0.4); color: white; }
.filter-card {
  margin: 16px;
  background: white;
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  align-items: center;
  box-shadow: var(--shadow);
}
.filter-row { display: flex; align-items: center; gap: 6px; flex: 1; cursor: pointer; }
.filter-label { font-size: 12px; color: var(--text2); }
.filter-val { font-size: 13px; font-weight: 600; color: var(--text1); }
.filter-divider { color: var(--text2); margin: 0 8px; }
.plans-list { padding: 0 16px; }
.date-group { margin-bottom: 16px; }
.date-label { font-size: 13px; font-weight: 700; color: var(--primary); margin-bottom: 8px; padding-left: 4px; }
.plan-card { background: white; border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; box-shadow: var(--shadow); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.meal-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
.meal-badge.breakfast { background: #fef3c7; color: #d97706; }
.meal-badge.lunch { background: #dcfce7; color: #16a34a; }
.meal-badge.dinner { background: #ede9fe; color: #7c3aed; }
</style>
