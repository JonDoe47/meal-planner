<template>
  <div class="dishes-page">
    <div class="page-header">
      <div class="header-title">菜品浏览</div>
    </div>

    <van-tabs v-model:active="activeCategory" color="#2563eb" shrink sticky offset-top="54" class="cat-tabs">
      <van-tab title="全部" name="all" />
      <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
    </van-tabs>

    <div class="dish-list">
      <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card" @click="openDish(dish)">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
          <div v-else class="dish-placeholder">🍽️</div>
          <van-tag v-if="dish.bvid" type="danger" size="mini" class="video-badge">视频</van-tag>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
          <div class="dish-desc" v-if="dish.description">{{ dish.description }}</div>
        </div>
        <van-icon name="arrow" color="#cbd5e1" size="16" />
      </div>
      <van-empty v-if="filteredDishes.length === 0" description="暂无菜品" />
    </div>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '85%', borderRadius: '20px 20px 0 0' }"
    >
      <div class="detail-wrap" v-if="currentDish">
        <div class="detail-handle"></div>
        <div class="detail-media">
          <div class="bili-player" v-if="currentDish.bvid">
            <iframe
              :src="`https://player.bilibili.com/player.html?bvid=${currentDish.bvid}&page=1&high_quality=1&danmaku=0`"
              scrolling="no" frameborder="0" allowfullscreen
              style="width:100%;height:100%"
            ></iframe>
          </div>
          <img v-else-if="currentDish.imageUrl" :src="currentDish.imageUrl" class="detail-img" />
          <div v-else class="detail-placeholder">🍽️</div>
        </div>
        <div class="detail-body">
          <div class="detail-name">{{ currentDish.name }}</div>
          <van-tag type="primary" plain>{{ currentDish.category.name }}</van-tag>
          <div class="detail-desc" v-if="currentDish.description">{{ currentDish.description }}</div>

          <!-- 食材 -->
          <div class="detail-section" v-if="parsedIngredients(currentDish).length > 0">
            <div class="section-title">食材</div>
            <div class="ing-row">
              <van-tag v-for="ing in parsedIngredients(currentDish)" :key="ing" type="success" plain round size="small" style="margin:3px">{{ ing }}</van-tag>
            </div>
          </div>

          <!-- 烹饪步骤 -->
          <div class="detail-section" v-if="parsedSteps(currentDish).length > 0">
            <div class="section-title">做法步骤</div>
            <div class="steps-list">
              <div v-for="(step, i) in parsedSteps(currentDish)" :key="i" class="step-item">
                <div class="step-badge">{{ i + 1 }}</div>
                <div class="step-content">{{ step }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { categoryApi, dishApi } from '../../api'

const categories = ref([])
const dishes = ref([])
const activeCategory = ref('all')
const showDetail = ref(false)
const currentDish = ref(null)

const filteredDishes = computed(() =>
  activeCategory.value === 'all' ? dishes.value : dishes.value.filter(d => d.categoryId === activeCategory.value)
)

function openDish(dish) { currentDish.value = dish; showDetail.value = true }

function parsedIngredients(dish) {
  if (!dish?.ingredients) return []
  try { return JSON.parse(dish.ingredients) } catch { return [] }
}
function parsedSteps(dish) {
  if (!dish?.cookingSteps) return []
  try { return JSON.parse(dish.cookingSteps) } catch { return [] }
}
onMounted(async () => {
  categories.value = await categoryApi.list()
  dishes.value = await dishApi.list()
})
</script>

<style scoped>
.dishes-page { padding-bottom: 60px; background: var(--bg); min-height: 100vh; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: 16px 20px;
  color: white;
}
.header-title { font-size: 18px; font-weight: 700; }
.dish-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dish-card {
  display: flex;
  align-items: center;
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow);
  gap: 0;
  cursor: pointer;
  padding-right: 12px;
  transition: transform 0.15s;
}
.dish-card:active { transform: scale(0.98); }
.dish-img-wrap { width: 90px; height: 80px; flex-shrink: 0; position: relative; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { width: 100%; height: 100%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 30px; }
.video-badge { position: absolute; top: 4px; left: 4px; }
.dish-info { flex: 1; padding: 12px; }
.dish-name { font-weight: 600; font-size: 15px; margin-bottom: 6px; color: var(--text1); }
.dish-desc { font-size: 12px; color: var(--text2); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }
.detail-wrap { height: 100%; overflow-y: auto; }
.detail-handle { width: 36px; height: 4px; background: #e2e8f0; border-radius: 2px; margin: 12px auto; }
.detail-media { width: 100%; height: 220px; }
.bili-player { width: 100%; height: 100%; background: #000; }
.detail-img { width: 100%; height: 100%; object-fit: cover; }
.detail-placeholder { width: 100%; height: 100%; background: var(--primary-light); display: flex; align-items: center; justify-content: center; font-size: 60px; }
.detail-body { padding: 16px; }
.detail-name { font-size: 20px; font-weight: 700; color: var(--text1); margin-bottom: 10px; }
.detail-desc { font-size: 14px; color: var(--text2); line-height: 1.6; margin-top: 12px; }

.detail-section { margin-top: 16px; }
.section-title {
  font-size: 13px; font-weight: 700; color: #64748b;
  margin-bottom: 8px;
  display: flex; align-items: center; gap: 6px;
}
.section-title::before {
  content: ''; display: inline-block;
  width: 3px; height: 14px;
  background: linear-gradient(#fb923c, #f97316);
  border-radius: 2px;
}
.ing-row { display: flex; flex-wrap: wrap; }
.steps-list { display: flex; flex-direction: column; gap: 10px; }
.step-item {
  display: flex; align-items: flex-start; gap: 12px;
  background: linear-gradient(135deg, #fff7ed, #fef3c7);
  border-radius: 12px; padding: 12px 14px;
  border-left: 3px solid #fb923c;
}
.step-badge {
  width: 24px; height: 24px; border-radius: 50%;
  background: linear-gradient(135deg, #fb923c, #f97316);
  color: white; font-size: 12px; font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-content { font-size: 14px; color: #1e293b; line-height: 1.65; flex: 1; }
</style>
