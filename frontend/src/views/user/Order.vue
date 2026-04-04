<template>
  <div class="order-page">
    <van-nav-bar title="点餐" />

    <div class="date-select">
      <van-cell title="选择日期" :value="selectedDate" is-link @click="showDatePicker = true" />
      <van-popup v-model:show="showDatePicker" position="bottom">
        <van-date-picker v-model="datePicker" :min-date="minDate" :max-date="maxDate" @confirm="onDateConfirm" @cancel="showDatePicker = false" />
      </van-popup>
    </div>

    <van-tabs v-model:active="activeMeal" color="#ff6b35" sticky>
      <van-tab v-for="meal in meals" :key="meal.type" :title="meal.label" :name="meal.type">
        <div class="meal-tab-content">
          <div class="selected-info" v-if="getSelected(meal.type).length > 0">
            <span>已选：</span>
            <van-tag v-for="d in getSelected(meal.type)" :key="d.id" closeable type="primary" @close="removeDish(meal.type, d.id)" style="margin: 2px">{{ d.name }}</van-tag>
          </div>

          <div class="category-filter">
            <van-tabs v-model:active="activeCategory" type="card" color="#ff6b35" shrink>
              <van-tab title="全部" name="all" />
              <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
            </van-tabs>
          </div>

          <div class="dish-grid">
            <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card" @click="toggleDish(meal.type, dish)">
              <div class="dish-img-wrap">
                <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
                <div v-else class="dish-placeholder">🍽️</div>
                <div class="dish-check" v-if="isDishSelected(meal.type, dish.id)">✓</div>
              </div>
              <div class="dish-name">{{ dish.name }}</div>
              <div class="dish-category">{{ dish.category.name }}</div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <div class="bottom-bar">
      <van-button type="primary" round block @click="saveOrder" :loading="saving">保存点餐</van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { showToast } from 'vant'
import { categoryApi, dishApi, mealApi } from '../../api'

const selectedDate = ref(new Date().toISOString().split('T')[0])
const showDatePicker = ref(false)
const datePicker = ref(selectedDate.value.split('-'))
const minDate = new Date()
minDate.setDate(minDate.getDate() - 7)
const maxDate = new Date()
maxDate.setDate(maxDate.getDate() + 30)

const activeMeal = ref('BREAKFAST')
const activeCategory = ref('all')
const meals = [
  { type: 'BREAKFAST', label: '早餐' },
  { type: 'LUNCH', label: '午餐' },
  { type: 'DINNER', label: '晚餐' }
]

const categories = ref([])
const dishes = ref([])
const selections = ref({ BREAKFAST: [], LUNCH: [], DINNER: [] })
const saving = ref(false)

const filteredDishes = computed(() => {
  if (activeCategory.value === 'all') return dishes.value
  return dishes.value.filter(d => d.categoryId === activeCategory.value)
})

function getSelected(mealType) { return selections.value[mealType] }
function isDishSelected(mealType, id) { return selections.value[mealType].some(d => d.id === id) }
function toggleDish(mealType, dish) {
  const arr = selections.value[mealType]
  const idx = arr.findIndex(d => d.id === dish.id)
  if (idx > -1) arr.splice(idx, 1)
  else arr.push(dish)
}
function removeDish(mealType, id) {
  const arr = selections.value[mealType]
  const idx = arr.findIndex(d => d.id === id)
  if (idx > -1) arr.splice(idx, 1)
}

function onDateConfirm({ selectedValues }) {
  selectedDate.value = selectedValues.join('-')
  showDatePicker.value = false
  loadExisting()
}

async function loadExisting() {
  selections.value = { BREAKFAST: [], LUNCH: [], DINNER: [] }
  const plans = await mealApi.list({ startDate: selectedDate.value, endDate: selectedDate.value })
  for (const plan of plans) {
    selections.value[plan.mealType] = plan.items.map(i => i.dish)
  }
}

async function saveOrder() {
  saving.value = true
  try {
    for (const meal of meals) {
      await mealApi.save({ date: selectedDate.value, mealType: meal.type, dishIds: selections.value[meal.type].map(d => d.id) })
    }
    showToast({ type: 'success', message: '点餐保存成功！' })
  } catch (e) {
    showToast({ type: 'fail', message: '保存失败' })
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  categories.value = await categoryApi.list()
  dishes.value = await dishApi.list()
  await loadExisting()
})
</script>

<style scoped>
.order-page { padding-bottom: 80px; }
.date-select { background: white; margin-bottom: 8px; }
.meal-tab-content { padding: 12px; }
.selected-info { background: #fff5f0; border-radius: 8px; padding: 10px; margin-bottom: 12px; font-size: 13px; }
.category-filter { margin-bottom: 12px; }
.dish-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dish-card { background: white; border-radius: 10px; overflow: hidden; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.06); }
.dish-img-wrap { position: relative; padding-top: 75%; }
.dish-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 30px; background: #f5f5f5; }
.dish-check { position: absolute; top: 4px; right: 4px; background: #ff6b35; color: white; width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 12px; }
.dish-name { padding: 6px 6px 2px; font-size: 13px; font-weight: 600; }
.dish-category { padding: 0 6px 6px; font-size: 11px; color: #999; }
.bottom-bar { position: fixed; bottom: 60px; left: 0; right: 0; padding: 10px 16px; background: white; border-top: 1px solid #f0f0f0; }
</style>
