<template>
  <div class="my-orders">
    <div class="header-bar">
      <div class="header-title">我的点餐记录</div>
      <van-button plain size="small" type="danger" @click="handleLogout">退出</van-button>
    </div>

    <div class="date-range">
      <van-cell title="开始日期" :value="startDate" is-link @click="showStart = true" />
      <van-cell title="结束日期" :value="endDate" is-link @click="showEnd = true" />
      <van-popup v-model:show="showStart" position="bottom">
        <van-date-picker v-model="startPicker" @confirm="v => { startDate = v.selectedValues.join('-'); showStart = false; loadPlans() }" @cancel="showStart = false" />
      </van-popup>
      <van-popup v-model:show="showEnd" position="bottom">
        <van-date-picker v-model="endPicker" @confirm="v => { endDate = v.selectedValues.join('-'); showEnd = false; loadPlans() }" @cancel="showEnd = false" />
      </van-popup>
    </div>

    <div class="plans-list" v-if="groupedPlans.length > 0">
      <div v-for="group in groupedPlans" :key="group.date" class="date-group">
        <div class="date-label">{{ group.date }}</div>
        <div v-for="plan in group.plans" :key="plan.id" class="plan-card">
          <div class="plan-meal-type">{{ mealTypeLabel(plan.mealType) }}</div>
          <div class="plan-dishes">
            <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain style="margin: 2px">{{ item.dish.name }}</van-tag>
          </div>
          <van-button size="mini" type="danger" plain @click="deletePlan(plan.id)" class="delete-btn">取消</van-button>
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
const weekAgo = new Date(today)
weekAgo.setDate(today.getDate() - 7)

const startDate = ref(weekAgo.toISOString().split('T')[0])
const endDate = ref(new Date(today.setDate(today.getDate() + 7)).toISOString().split('T')[0])
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

function mealTypeLabel(type) {
  return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[type] || type
}

async function loadPlans() {
  plans.value = await mealApi.list({ startDate: startDate.value, endDate: endDate.value })
}

async function deletePlan(id) {
  await showConfirmDialog({ title: '确认', message: '确定取消这个点餐吗？' })
  await mealApi.delete(id)
  showToast({ type: 'success', message: '已取消' })
  loadPlans()
}

function handleLogout() {
  auth.logout()
  router.push('/login')
}

onMounted(loadPlans)
</script>

<style scoped>
.my-orders { padding-bottom: 60px; }
.header-bar { display: flex; justify-content: space-between; align-items: center; padding: 16px; background: linear-gradient(135deg, #ff6b35, #f7931e); color: white; }
.header-title { font-size: 18px; font-weight: 700; }
.date-range { background: white; margin-bottom: 8px; }
.plans-list { padding: 12px; }
.date-group { margin-bottom: 16px; }
.date-label { font-weight: 700; color: #333; margin-bottom: 8px; padding-left: 4px; }
.plan-card { background: white; border-radius: 10px; padding: 12px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); position: relative; }
.plan-meal-type { font-weight: 600; color: #ff6b35; margin-bottom: 8px; }
.delete-btn { position: absolute; top: 12px; right: 12px; }
</style>
