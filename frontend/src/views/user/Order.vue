<template>
  <div class="order-page">
    <div class="page-header">
      <div class="header-title">选择点餐</div>
      <div class="date-chip" @click="showDatePicker = true">
        <van-icon name="calendar-o" size="14" />
        <span>{{ selectedDate }}</span>
        <van-icon name="arrow-down" size="12" />
      </div>
    </div>

    <van-popup v-model:show="showDatePicker" position="bottom" round>
      <van-date-picker v-model="datePicker" :min-date="minDate" :max-date="maxDate" @confirm="onDateConfirm" @cancel="showDatePicker = false" />
    </van-popup>

    <van-tabs v-model:active="activeMeal" color="#2563eb" line-width="24px" sticky offset-top="54">
      <van-tab v-for="meal in meals" :key="meal.type" :title="meal.label" :name="meal.type">
        <div class="tab-content">
          <!-- 已选菜品 -->
          <div class="selected-bar" v-if="getSelected(meal.type).length > 0">
            <span class="selected-label">已选：</span>
            <div class="selected-tags">
              <van-tag
                v-for="d in getSelected(meal.type)" :key="d.id"
                closeable type="primary" round
                @close="removeDish(meal.type, d.id)"
                style="margin: 3px;"
              >{{ d.name }}</van-tag>
            </div>
          </div>

          <!-- 分类筛选 -->
          <van-tabs v-model:active="activeCategory" type="card" color="#2563eb" shrink class="cat-tabs">
            <van-tab title="全部" name="all" />
            <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
          </van-tabs>

          <!-- 菜品网格 -->
          <div class="dish-grid">
            <div
              v-for="dish in filteredDishes" :key="dish.id"
              class="dish-card" :class="{ selected: isDishSelected(meal.type, dish.id) }"
              @click="toggleDish(meal.type, dish)"
            >
              <div class="dish-img-wrap">
                <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
                <div v-else class="dish-placeholder">🍽️</div>
                <div class="selected-overlay" v-if="isDishSelected(meal.type, dish.id)">
                  <van-icon name="success" size="20" color="white" />
                </div>
              </div>
              <div class="dish-info-sm">
                <div class="dish-name-sm">{{ dish.name }}</div>
                <div class="dish-cat-sm">{{ dish.category.name }}</div>
              </div>
            </div>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <div class="save-bar">
      <div class="save-summary">
        共选 {{ totalSelected }} 道菜
      </div>
      <van-button type="primary" round :loading="saving" @click="saveOrder" class="save-btn">
        保存点餐
      </van-button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { categoryApi, dishApi, mealApi } from '../../api'

const selectedDate = ref(new Date().toISOString().split('T')[0])
const showDatePicker = ref(false)
const datePicker = ref(selectedDate.value.split('-'))
const minDate = new Date(); minDate.setDate(minDate.getDate() - 7)
const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30)
const activeMeal = ref('BREAKFAST')
const activeCategory = ref('all')
const meals = [{ type: 'BREAKFAST', label: '☀️ 早餐' }, { type: 'LUNCH', label: '🌤️ 午餐' }, { type: 'DINNER', label: '🌙 晚餐' }]
const categories = ref([])
const dishes = ref([])
const selections = ref({ BREAKFAST: [], LUNCH: [], DINNER: [] })
const saving = ref(false)

const filteredDishes = computed(() => activeCategory.value === 'all' ? dishes.value : dishes.value.filter(d => d.categoryId === activeCategory.value))
const totalSelected = computed(() => Object.values(selections.value).flat().length)
function getSelected(t) { return selections.value[t] }
function isDishSelected(t, id) { return selections.value[t].some(d => d.id === id) }
function toggleDish(t, dish) {
  const arr = selections.value[t]
  const idx = arr.findIndex(d => d.id === dish.id)
  idx > -1 ? arr.splice(idx, 1) : arr.push(dish)
}
function removeDish(t, id) {
  const arr = selections.value[t]
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
  for (const plan of plans) selections.value[plan.mealType] = plan.items.map(i => i.dish)
}
async function saveOrder() {
  saving.value = true
  try {
    for (const meal of meals) {
      await mealApi.save({ date: selectedDate.value, mealType: meal.type, dishIds: selections.value[meal.type].map(d => d.id) })
    }
    showToast({ type: 'success', message: '点餐保存成功！' })
  } catch {
    showToast({ type: 'fail', message: '保存失败' })
  } finally { saving.value = false }
}
onMounted(async () => {
  categories.value = await categoryApi.list()
  dishes.value = await dishApi.list()
  await loadExisting()
})
</script>

<style scoped>
.order-page { padding-bottom: 80px; background: var(--bg); min-height: 100vh; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: 16px 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.header-title { font-size: 18px; font-weight: 700; color: white; }
.date-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255,255,255,0.2);
  color: white;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 13px;
  cursor: pointer;
}
.tab-content { padding: 12px; }
.selected-bar {
  background: var(--primary-light);
  border-radius: 10px;
  padding: 10px 12px;
  margin-bottom: 12px;
  display: flex;
  align-items: flex-start;
  gap: 6px;
}
.selected-label { font-size: 13px; color: var(--primary); font-weight: 600; white-space: nowrap; padding-top: 4px; }
.selected-tags { display: flex; flex-wrap: wrap; }
.cat-tabs { margin-bottom: 12px; }
.dish-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dish-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
  border: 2px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}
.dish-card.selected { border-color: var(--primary); }
.dish-img-wrap { position: relative; padding-top: 72%; }
.dish-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { position: absolute; inset: 0; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 28px; }
.selected-overlay {
  position: absolute; inset: 0;
  background: rgba(37,99,235,0.6);
  display: flex; align-items: center; justify-content: center;
}
.dish-info-sm { padding: 6px; }
.dish-name-sm { font-size: 12px; font-weight: 600; color: var(--text1); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-cat-sm { font-size: 10px; color: var(--text2); }
.save-bar {
  position: fixed; bottom: 60px; left: 0; right: 0;
  background: white;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2px 12px rgba(0,0,0,0.06);
}
.save-summary { font-size: 14px; color: var(--text2); }
.save-btn { width: 120px; }
</style>
