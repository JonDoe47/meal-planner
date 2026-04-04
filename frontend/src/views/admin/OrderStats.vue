<template>
  <div class="order-stats">
    <van-nav-bar title="点餐统计" />
    <div class="filter">
      <van-cell title="成员" :value="selectedUserName" is-link @click="showUserPicker = true" />
      <van-cell title="开始日期" :value="startDate" is-link @click="showStart = true" />
      <van-cell title="结束日期" :value="endDate" is-link @click="showEnd = true" />
    </div>

    <van-popup v-model:show="showUserPicker" position="bottom">
      <van-picker :columns="userOptions" @confirm="onUserConfirm" @cancel="showUserPicker = false" />
    </van-popup>
    <van-popup v-model:show="showStart" position="bottom">
      <van-date-picker v-model="startPicker" @confirm="v => { startDate = v.selectedValues.join('-'); showStart = false; loadPlans() }" @cancel="showStart = false" />
    </van-popup>
    <van-popup v-model:show="showEnd" position="bottom">
      <van-date-picker v-model="endPicker" @confirm="v => { endDate = v.selectedValues.join('-'); showEnd = false; loadPlans() }" @cancel="showEnd = false" />
    </van-popup>

    <div class="plans-list" v-if="groupedPlans.length > 0">
      <div v-for="group in groupedPlans" :key="group.date" class="date-group">
        <div class="date-label">{{ group.date }}</div>
        <div v-for="plan in group.plans" :key="plan.id" class="plan-card">
          <div class="plan-header">
            <span class="meal-type">{{ mealTypeLabel(plan.mealType) }}</span>
            <van-tag type="warning" plain size="small">{{ plan.user.name }}</van-tag>
          </div>
          <div class="plan-dishes">
            <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain style="margin:2px">{{ item.dish.name }}</van-tag>
          </div>
        </div>
      </div>
    </div>
    <van-empty v-else description="暂无数据" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { mealApi, userApi } from '../../api'

const plans = ref([])
const users = ref([])
const selectedUserId = ref('all')
const showUserPicker = ref(false)
const showStart = ref(false)
const showEnd = ref(false)

const today = new Date()
const weekAgo = new Date(today)
weekAgo.setDate(today.getDate() - 7)
const startDate = ref(weekAgo.toISOString().split('T')[0])
const endDate = ref(new Date().toISOString().split('T')[0])
const startPicker = ref(startDate.value.split('-'))
const endPicker = ref(endDate.value.split('-'))

const userOptions = computed(() => [{ text: '全部成员', value: 'all' }, ...users.value.map(u => ({ text: u.name, value: u.id }))])
const selectedUserName = computed(() => userOptions.value.find(u => u.value === selectedUserId.value)?.text || '全部成员')

function onUserConfirm({ selectedOptions }) { selectedUserId.value = selectedOptions[0].value; showUserPicker.value = false; loadPlans() }
function mealTypeLabel(type) { return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[type] || type }

const groupedPlans = computed(() => {
  const map = {}
  for (const plan of plans.value) {
    if (!map[plan.date]) map[plan.date] = []
    map[plan.date].push(plan)
  }
  return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([date, ps]) => ({ date, plans: ps }))
})

async function loadPlans() {
  const params = { startDate: startDate.value, endDate: endDate.value }
  if (selectedUserId.value !== 'all') params.userId = selectedUserId.value
  plans.value = await mealApi.list(params)
}

onMounted(async () => {
  users.value = await userApi.list()
  await loadPlans()
})
</script>

<style scoped>
.order-stats { padding-bottom: 20px; }
.filter { background: white; margin-bottom: 8px; }
.plans-list { padding: 12px; }
.date-group { margin-bottom: 16px; }
.date-label { font-weight: 700; color: #333; margin-bottom: 8px; padding-left: 4px; }
.plan-card { background: white; border-radius: 10px; padding: 12px; margin-bottom: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.meal-type { font-weight: 600; color: #667eea; }
</style>
