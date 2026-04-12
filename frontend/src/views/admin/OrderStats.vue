<template>
  <div class="order-stats">
    <div class="page-header">
      <div class="header-title">点餐统计</div>
    </div>

    <div class="filter-card">
      <div class="filter-item" @click="showUserPicker = true">
        <van-icon name="friends-o" color="#2563eb" size="16" />
        <span class="filter-label">成员</span>
        <span class="filter-val">{{ selectedUserName }}</span>
        <van-icon name="arrow-down" size="12" color="#94a3b8" />
      </div>
      <div class="filter-item" @click="showStart = true">
        <van-icon name="calendar-o" color="#2563eb" size="16" />
        <span class="filter-label">开始</span>
        <span class="filter-val">{{ startDate }}</span>
      </div>
      <div class="filter-item" @click="showEnd = true">
        <van-icon name="calendar-o" color="#2563eb" size="16" />
        <span class="filter-label">结束</span>
        <span class="filter-val">{{ endDate }}</span>
      </div>
    </div>

    <van-popup v-model:show="showUserPicker" position="bottom" round>
      <van-picker :columns="userOptions" @confirm="onUserConfirm" @cancel="showUserPicker = false" />
    </van-popup>
    <van-popup v-model:show="showStart" position="bottom" round>
      <van-date-picker v-model="startPicker" @confirm="v => { startDate = v.selectedValues.join('-'); showStart = false; loadPlans() }" @cancel="showStart = false" />
    </van-popup>
    <van-popup v-model:show="showEnd" position="bottom" round>
      <van-date-picker v-model="endPicker" @confirm="v => { endDate = v.selectedValues.join('-'); showEnd = false; loadPlans() }" @cancel="showEnd = false" />
    </van-popup>

    <transition-group name="stat-anim" tag="div" class="plans-list" v-if="groupedPlans.length > 0">
      <div v-for="group in groupedPlans" :key="group.date" class="date-group">
        <div class="date-label"><span class="dot"></span>{{ group.date }}</div>
        <transition-group tag="div" :key="'cards'+group.date" name="plan-card-anim">
          <div v-for="plan in group.plans" :key="plan.id" class="plan-card">
            <div class="plan-header">
              <div class="meal-badge" :class="plan.mealType.toLowerCase()">{{ mealTypeLabel(plan.mealType) }}</div>
              <van-tag type="warning" plain size="small">{{ plan.user.name }}</van-tag>
            </div>
            <div class="plan-dishes">
              <van-tag v-for="item in plan.items" :key="item.id" type="primary" plain class="plan-dish-tag">{{ item.dish.name }}</van-tag>
            </div>
          </div>
        </transition-group>
      </div>
    </transition-group>
    <van-empty v-else description="暂无点餐记录" image-size="100" />
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
const weekAgo = new Date(today); weekAgo.setDate(today.getDate() - 7)
const startDate = ref(weekAgo.toISOString().split('T')[0])
const endDate = ref(new Date().toISOString().split('T')[0])
const startPicker = ref(startDate.value.split('-'))
const endPicker = ref(endDate.value.split('-'))

const userOptions = computed(() => [{ text: '全部成员', value: 'all' }, ...users.value.map(u => ({ text: u.name, value: u.id }))])
const selectedUserName = computed(() => userOptions.value.find(u => u.value === selectedUserId.value)?.text || '全部成员')
function onUserConfirm({ selectedOptions }) { selectedUserId.value = selectedOptions[0].value; showUserPicker.value = false; loadPlans() }
function mealTypeLabel(t) { return { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }[t] || t }
const groupedPlans = computed(() => {
  const map = {}
  for (const plan of plans.value) { if (!map[plan.date]) map[plan.date] = []; map[plan.date].push(plan) }
  return Object.entries(map).sort(([a],[b]) => a.localeCompare(b)).map(([date, ps]) => ({ date, plans: ps }))
})
async function loadPlans() { const params = { startDate: startDate.value, endDate: endDate.value }; if (selectedUserId.value !== 'all') params.userId = selectedUserId.value; plans.value = await mealApi.list(params) }
onMounted(async () => { users.value = await userApi.list(); await loadPlans() })
</script>

<style scoped>
.order-stats { min-height: 100vh; background: var(--bg); padding-bottom: 20px; }
.page-header { background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%); padding: var(--space-lg); color: white; flex-shrink: 0; }
.header-title { font-size: 18px; font-weight: 800; }

.filter-card {
  margin: var(--space-lg); background: white; border-radius: var(--radius-md);
  box-shadow: var(--shadow); overflow: hidden;
}
.filter-item {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; cursor: pointer; border-bottom: 1px solid var(--border-light);
  transition: background 0.15s;
}
.filter-item:hover { background: var(--bg); }
.filter-item:last-child { border-bottom: none; }
.filter-label { font-size: 12px; color: var(--text2); width: 32px; font-weight: 600; flex-shrink: 0; }
.filter-val { flex: 1; font-size: 13px; font-weight: 700; color: var(--text1); }

.plans-list { padding: 0 var(--space-lg) var(--space-xl); position: relative; z-index: 0; }
.stat-anim-move { transition: all 0.35s ease; }
.stat-anim-enter-active { transition: all 0.25s ease-out; }
.stat-anim-enter-from { opacity: 0; transform: translateY(10px); }
.plan-card-anim-move { transition: all 0.25s ease; }

.date-group { margin-bottom: var(--space-xl); }
.date-label { font-size: 14px; font-weight: 800; color: var(--primary); margin-bottom: var(--space-sm); padding-left: 4px; display: flex; align-items: center; gap: 6px; }
.dot { width: 8px; height: 8px; border-radius: 50%; background: linear-gradient(135deg, #2563eb, #60a5fa); flex-shrink: 0; }
.plan-card { background: white; border-radius: var(--radius-md); padding: 14px; margin-bottom: 8px; box-shadow: var(--shadow); transition: all 0.2s; border-left: 3px solid transparent; }
.plan-card:hover { border-color: #bfdbfe; box-shadow: var(--shadow-md); }
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; flex-wrap: wrap; gap: 6px; }
.meal-badge { padding: 5px 14px; border-radius: var(--radius-full); font-size: 12px; font-weight: 700; letter-spacing: 0.5px; white-space: nowrap; }
.plan-dishes { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.plan-dish-tag { margin: 0 !important; transition: transform 0.15s; }
.plan-dish-tag:hover { transform: scale(1.05); }
</style>