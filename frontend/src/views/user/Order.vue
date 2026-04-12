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
          <transition name="slide-down">
            <div class="selected-bar" v-if="getSelected(meal.type).length > 0">
              <span class="selected-label">已选：</span>
              <div class="selected-tags">
                <van-tag
                  v-for="d in getSelected(meal.type)" :key="d.id"
                  closeable type="primary" round
                  @close="removeDish(meal.type, d.id)"
                  class="sel-tag"
                >{{ d.name }}</van-tag>
              </div>
            </div>
          </transition>

          <!-- 分类筛选 -->
          <van-tabs v-model:active="activeCategory" type="card" color="#2563eb" shrink class="cat-tabs">
            <van-tab title="全部" name="all" />
            <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
          </van-tabs>

          <!-- 菜品网格 -->
          <div class="dish-grid">
            <transition-group name="dish-grid-anim" tag="template">
              <div
                v-for="dish in filteredDishes"
                :key="dish.id"
                class="dish-card"
                :class="{ selected: isDishSelected(meal.type, dish.id) }"
                @click="toggleDish(meal.type, dish)"
              >
                <div class="dish-img-wrap">
                  <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" loading="lazy" />
                  <div v-else class="dish-placeholder">🍽️</div>
                  <transition name="check-pop">
                    <div class="selected-overlay" v-if="isDishSelected(meal.type, dish.id)">
                      <van-icon name="success" size="20" color="white" />
                    </div>
                  </transition>
                </div>
                <div class="dish-info-sm">
                  <div class="dish-name-sm">{{ dish.name }}</div>
                  <div class="dish-cat-sm">{{ dish.category.name }}</div>
                </div>
              </div>
            </transition-group>
          </div>
        </div>
      </van-tab>
    </van-tabs>

    <div class="save-bar">
      <div class="save-summary">共选 <strong>{{ totalSelected }}</strong> 道菜</div>
      <van-button type="primary" round :loading="saving" @click="saveOrder" class="save-btn">
        保存点餐
      </van-button>
    </div>

    <!-- 食材清单弹窗 -->
    <van-popup v-model:show="showIngredients" position="bottom" round :style="{ maxHeight: '70%' }">
      <div class="ing-popup">
        <div class="ing-popup-bar"></div>
        <div class="ing-popup-title">
          <span>今日食材清单</span>
          <van-tag type="success" size="small">已推送给管理员</van-tag>
        </div>
        <div class="ing-popup-sub">{{ selectedDate }} 所需食材汇总</div>

        <div class="ing-popup-body">
          <div v-if="ingredientsByMeal.length === 0" class="ing-empty">所选菜品暂无配置食材</div>
          <div v-for="meal in ingredientsByMeal" :key="meal.mealType" class="ing-meal-block">
            <div class="ing-meal-label" :class="meal.mealType.toLowerCase()">{{ meal.mealLabel }}</div>
            <div v-for="dish in meal.dishes" :key="dish.name" class="ing-dish-row">
              <span class="ing-dish-name">{{ dish.name }}</span>
              <div class="ing-tags-wrap">
                <van-tag v-for="ing in dish.ingredients" :key="ing" plain type="primary" size="small" class="ing-tag">{{ ing }}</van-tag>
                <span v-if="dish.ingredients.length === 0" class="ing-none">暂无食材信息</span>
              </div>
            </div>
          </div>
        </div>

        <div class="ing-popup-foot">
          <van-button round block type="primary" @click="showIngredients = false">知道了</van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { categoryApi, dishApi, mealApi, ingredientApi } from '../../api'

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
const showIngredients = ref(false)
const ingredientsByMeal = ref([])

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
    try {
      ingredientsByMeal.value = await ingredientApi.byOrder({ date: selectedDate.value })
      showIngredients.value = true
    } catch {}
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
  padding: var(--space-lg); display: flex;
  justify-content: space-between; align-items: center;
}
.header-title { font-size: 18px; font-weight: 800; color: white; }
.date-chip {
  display: flex; align-items: center; gap: 6px;
  background: rgba(255,255,255,0.2); color: white;
  padding: 6px 14px; border-radius: var(--radius-full);
  font-size: 13px; cursor: pointer; font-weight: 600;
  transition: all 0.2s;
}
.date-chip:hover { background: rgba(255,255,255,0.28); }
.tab-content { padding: var(--space-md); }
.selected-bar {
  background: linear-gradient(135deg, #eff6ff, #dbeafe); border-radius: var(--radius-md);
  padding: 10px 12px; margin-bottom: 12px;
  display: flex; align-items: flex-start; gap: 6px;
  border-left: 3px solid var(--primary);
}
.selected-label { font-size: 13px; color: var(--primary); font-weight: 700; white-space: nowrap; padding-top: 4px; }
.selected-tags { display: flex; flex-wrap: wrap; flex: 1; }
.sel-tag { margin: 3px !important; transition: transform 0.15s; }
.sel-tag:hover { transform: scale(1.04); }

.cat-tabs { margin-bottom: 12px; }
.dish-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.dish-card {
  background: white; border-radius: var(--radius-md); overflow: hidden;
  box-shadow: var(--shadow); border: 2.5px solid transparent;
  transition: all 0.25s ease; cursor: pointer;
}
.dish-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
.dish-card.selected { border-color: var(--primary); box-shadow: 0 4px 16px rgba(37,99,235,0.18); transform: translateY(-3px); }
.dish-img-wrap { position: relative; padding-top: 72%; overflow: hidden; }
.dish-img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
.dish-card:hover .dish-img { transform: scale(1.06); }
.dish-placeholder {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, var(--primary-light), #dbeafe);
  display: flex; align-items: center; justify-content: center; font-size: 26px;
}
.selected-overlay {
  position: absolute; inset: 0;
  background: linear-gradient(135deg, rgba(37,99,235,0.75), rgba(59,130,246,0.7));
  display: flex; align-items: center; justify-content: center;
  z-index: 2; backdrop-filter: blur(2px);
}
.dish-info-sm { padding: 6px; }
.dish-name-sm { font-size: 12px; font-weight: 700; color: var(--text1); margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.dish-cat-sm { font-size: 10px; color: var(--text2); }

/* 动画 */
.slide-down-enter-active { transition: all 0.25s ease-out; }
.slide-down-enter-from { opacity: 0; transform: translateY(-8px); height: 0; padding: 0; margin: 0; }
.check-pop-enter-active { transition: all 0.2s ease-out; }
.check-pop-enter-from { opacity: 0; transform: scale(0.5); }
.check-pop-leave-active { transition: all 0.1s ease-in; }
.check-pop-leave-to { opacity: 0; transform: scale(0.5); }
.dish-grid-anim-move { transition: transform 0.3s ease; }

/* 底部保存栏 */
.save-bar {
  position: fixed; bottom: 60px; left: 0; right: 0;
  background: white; padding: 10px 16px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 -2px 20px rgba(0,0,0,0.08); z-index: 100;
}
.save-summary { font-size: 14px; color: var(--text2); }
.save-summary strong { color: var(--primary); font-weight: 800; }
.save-btn { width: 120px; font-weight: 700; }

/* 食材弹窗 */
.ing-popup { padding: 0 0 16px; background: white; }
.ing-popup-bar { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto 0; }
.ing-popup-title { display: flex; align-items: center; gap: 8px; padding: 14px 16px 4px; font-size: 16px; font-weight: 700; color: var(--text1); }
.ing-popup-sub { padding: 0 16px 12px; font-size: 12px; color: var(--text2); }
.ing-popup-body { max-height: 44vh; overflow-y: auto; padding: 0 16px; }
.ing-empty { text-align: center; color: var(--text2); font-size: 14px; padding: 24px 0; }
.ing-meal-block { margin-bottom: 16px; }
.ing-meal-label { font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: var(--radius-full); display: inline-block; margin-bottom: 10px; letter-spacing: 0.5px; }
.ing-dish-row { margin-bottom: 8px; padding: 8px 10px; background: var(--bg); border-radius: var(--radius-sm); }
.ing-dish-name { font-size: 13px; font-weight: 700; color: var(--text1); margin-bottom: 6px; display: block; }
.ing-tags-wrap { display: flex; flex-wrap: wrap; }
.ing-tag { margin: 2px !important; }
.ing-none { font-size: 12px; color: var(--text3); }
.ing-popup-foot { padding: 12px 16px 0; }
</style>