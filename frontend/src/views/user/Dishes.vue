<template>
  <div class="dishes-page">
    <div class="page-header">
      <div class="header-title">菜品浏览</div>
    </div>

    <van-tabs v-model:active="activeCategory" color="#2563eb" shrink sticky offset-top="54" class="cat-tabs" @change="onCategoryChange">
      <van-tab title="全部" name="all" />
      <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
    </van-tabs>

    <div class="dish-list">
      <!-- 精细骨架屏 -->
      <template v-if="loading">
        <div v-for="i in 3" :key="'sk'+i" class="dish-card skeleton">
          <div class="sk-img"></div>
          <div class="sk-body">
            <div class="sk-line sk-name"></div>
            <div class="sk-line sk-tag"></div>
            <div class="sk-line sk-desc"></div>
          </div>
        </div>
      </template>
      <template v-else>
      <transition-group name="dish-slide" tag="div">
      <div v-for="dish in filteredDishes" :key="dish.id" class="dish-card" @click="openDish(dish)">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" loading="lazy" />
          <div v-else class="dish-placeholder">🍽️</div>
          <van-tag v-if="dish.bvid" type="danger" size="mini" class="video-badge">视频</van-tag>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
          <div class="dish-meta">
            <span v-if="dish.avgRating" class="dish-rating">★ {{ dish.avgRating }} ({{ dish.ratingCount }})</span>
          </div>
          <div class="dish-desc" v-if="dish.description">{{ dish.description }}</div>
        </div>
        <van-icon name="arrow" color="#cbd5e1" size="16" />
      </div>
      </transition-group>
      </template>
      <van-empty v-if="!loading && filteredDishes.length === 0" description="暂无菜品" />
    </div>

    <!-- 详情弹窗 -->
    <van-popup
      v-model:show="showDetail"
      position="bottom"
      :style="{ height: '90%', borderRadius: '20px 20px 0 0' }"
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
        <div class="detail-scroll">
        <div class="detail-body">
          <div class="detail-name-row">
            <div class="detail-name">{{ currentDish.name }}</div>
            <van-tag type="primary" plain>{{ currentDish.category.name }}</van-tag>
          </div>
          <div class="detail-desc" v-if="currentDish.description">{{ currentDish.description }}</div>

          <!-- 食材 -->
          <div class="detail-section" v-if="parsedIngredients(currentDish).length > 0">
            <div class="section-title">🧄 食材</div>
            <div class="ing-row">
              <van-tag v-for="ing in parsedIngredients(currentDish)" :key="ing" type="success" plain round size="small" class="ing-tag">{{ ing }}</van-tag>
            </div>
          </div>

          <!-- 烹饪步骤 -->
          <div class="detail-section" v-if="parsedSteps(currentDish).length > 0">
            <div class="section-title">👨‍🍳 做法步骤</div>
            <div class="steps-list">
              <div v-for="(step, i) in parsedSteps(currentDish)" :key="i" class="step-item">
                <div class="step-badge">{{ i + 1 }}</div>
                <div class="step-content">{{ step }}</div>
              </div>
            </div>
          </div>

          <!-- 关联菜品（如火锅→锅底/蘸料） -->
          <div class="detail-section" v-if="Object.keys(dishBindings).length > 0">
            <div class="section-title">🔗 关联搭配</div>
            <div class="bind-sections">
              <div v-for="(items, type) in dishBindings" :key="type" class="bind-group-card">
                <div class="bind-type-header">{{ type }}</div>
                <div class="bind-cards">
                  <div v-for="item in items" :key="item.dishId" class="bind-item-card" @click.stop="goToDish(item)">
                    <img v-if="item.imageUrl" :src="item.imageUrl" class="bind-thumb" />
                    <div v-else class="bind-thumb-placeholder">🍽️</div>
                    <div class="bind-info">
                      <div class="bind-name">{{ item.name }}</div>
                      <van-tag type="primary" plain size="mini">{{ item.categoryName }}</van-tag>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 评价区 -->
          <div class="detail-section">
            <div class="section-title section-rating-title">
              ⭐ 用餐评价
              <span v-if="dishRatings.length" class="rating-avg">均分 ★ {{ currentAvgRating }}</span>
            </div>

            <!-- 我的评价表单 -->
            <div class="my-rating-form">
              <div class="my-rating-label">{{ myRating ? '修改我的评价' : '写下你的评价' }}</div>
              <van-rate v-model="ratingScore" :count="5" color="#f59e0b" void-color="#d1d5db" size="24px" />
              <van-field
                v-model="ratingComment"
                type="textarea"
                placeholder="口味如何？欢迎写下点评（可选）"
                rows="2"
                class="rating-field"
              />
              <div class="rating-btns">
                <van-button
                  type="primary" round size="small" block
                  :loading="ratingLoading"
                  :disabled="ratingScore === 0"
                  @click="submitRating"
                >提交评价</van-button>
                <van-button
                  v-if="myRating"
                  type="danger" plain round size="small"
                  @click="deleteMyRating"
                >删除</van-button>
              </div>
            </div>

            <!-- 评价列表 -->
            <div v-if="dishRatings.length > 0" class="ratings-list">
              <div v-for="r in dishRatings" :key="r.id" class="rating-item">
                <div class="rating-avatar">{{ r.user.name.charAt(0) }}</div>
                <div class="rating-content">
                  <div class="rating-header">
                    <span class="rating-name">{{ r.user.name }}</span>
                    <van-rate :model-value="r.score" readonly :count="5" color="#f59e0b" void-color="#e2e8f0" size="13px" />
                  </div>
                  <div v-if="r.comment" class="rating-comment">{{ r.comment }}</div>
                  <div class="rating-time">{{ formatTime(r.createdAt) }}</div>
                </div>
              </div>
            </div>
            <div v-else class="no-ratings">暂无评价，快来第一个点评吧 🎉</div>
          </div>
        </div>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import { categoryApi, dishApi, ratingApi, dishBindingApi } from '../../api'
import { useAuthStore } from '../../stores/auth'

const auth = useAuthStore()
const categories = ref([])
const dishes = ref([])
const activeCategory = ref('all')
const showDetail = ref(false)
const currentDish = ref(null)
const loading = ref(false)

const dishBindings = ref({})

const dishRatings = ref([])
const ratingScore = ref(0)
const ratingComment = ref('')
const ratingLoading = ref(false)

const myRating = computed(() => dishRatings.value.find(r => r.userId === auth.user?.id))

const currentAvgRating = computed(() => {
  if (!dishRatings.value.length) return null
  const avg = dishRatings.value.reduce((s, r) => s + r.score, 0) / dishRatings.value.length
  return Math.round(avg * 10) / 10
})

const filteredDishes = computed(() => dishes.value)

async function openDish(dish) {
  currentDish.value = dish
  showDetail.value = true
  dishRatings.value = []
  ratingScore.value = 0
  ratingComment.value = ''
  dishBindings.value = {}

  const [ratings, bindings] = await Promise.all([
    ratingApi.list(dish.id),
    dishBindingApi.list(dish.id).catch(() => ({}))
  ])
  dishRatings.value = ratings
  dishBindings.value = bindings

  const mine = ratings.find(r => r.userId === auth.user?.id)
  if (mine) {
    ratingScore.value = mine.score
    ratingComment.value = mine.comment || ''
  }
}

function goToDish(item) {
  const targetDish = dishes.value.find(d => d.id === item.dishId)
  if (targetDish) openDish(targetDish)
}

async function loadDishes() {
  loading.value = true
  try {
    const params = activeCategory.value !== 'all' ? { categoryId: activeCategory.value } : {}
    dishes.value = await dishApi.list(params)
  } finally {
    loading.value = false
  }
}

function onCategoryChange(name) {
  activeCategory.value = name
  loadDishes()
}

async function submitRating() {
  if (!ratingScore.value) return
  ratingLoading.value = true
  try {
    await ratingApi.save({ dishId: currentDish.value.id, score: ratingScore.value, comment: ratingComment.value })
    const ratings = await ratingApi.list(currentDish.value.id)
    dishRatings.value = ratings
    const idx = dishes.value.findIndex(d => d.id === currentDish.value.id)
    if (idx !== -1) {
      const avg = ratings.length ? Math.round(ratings.reduce((s, r) => s + r.score, 0) / ratings.length * 10) / 10 : null
      dishes.value[idx] = { ...dishes.value[idx], avgRating: avg, ratingCount: ratings.length }
    }
    showToast({ type: 'success', message: '评价成功！' })
  } catch (e) {
    showToast({ type: 'fail', message: e.message || '评价失败' })
  } finally {
    ratingLoading.value = false
  }
}

async function deleteMyRating() {
  if (!myRating.value) return
  try {
    await ratingApi.remove(myRating.value.id)
    const ratings = await ratingApi.list(currentDish.value.id)
    dishRatings.value = ratings
    ratingScore.value = 0
    ratingComment.value = ''
    showToast({ type: 'success', message: '已删除评价' })
  } catch (e) {
    showToast({ type: 'fail', message: '删除失败' })
  }
}

function parsedIngredients(dish) {
  if (!dish?.ingredients) return []
  try { return JSON.parse(dish.ingredients) } catch { return [] }
}
function parsedSteps(dish) {
  if (!dish?.cookingSteps) return []
  try { return JSON.parse(dish.cookingSteps) } catch { return [] }
}

function formatTime(iso) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`
}

onMounted(async () => {
  categories.value = await categoryApi.list()
  await loadDishes()
})
</script>

<style scoped>
.dishes-page { padding-bottom: 60px; background: var(--bg); min-height: 100vh; }
.page-header {
  background: linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%);
  padding: var(--space-lg); color: white;
}
.header-title { font-size: 18px; font-weight: 800; }

.dish-list { padding: var(--space-md); display: flex; flex-direction: column; gap: 10px; }
.dish-card {
  display: flex; align-items: center;
  background: white; border-radius: var(--radius-md);
  overflow: hidden; box-shadow: var(--shadow);
  gap: 0; cursor: pointer;
  padding-right: 12px; transition: transform 0.15s, box-shadow 0.15s;
}
.dish-card:active { transform: scale(0.98); box-shadow: var(--shadow-sm); }
.dish-img-wrap { width: 90px; height: 80px; flex-shrink: 0; position: relative; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary-light), #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 28px; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; }
.video-badge { position: absolute; top: 4px; left: 4px; }
.dish-info { flex: 1; padding: 12px; min-width: 0; }
.dish-name { font-weight: 700; font-size: 15px; margin-bottom: 6px; color: var(--text1); }
.dish-meta { margin-top: 4px; display: flex; align-items: center; gap: 8px; }
.dish-rating { font-size: 12px; color: var(--warm-amber); font-weight: 700; background: #fffbeb; padding: 2px 8px; border-radius: 10px; }
.dish-desc { font-size: 12px; color: var(--text2); margin-top: 6px; display: -webkit-box; -webkit-line-clamp: 1; -webkit-box-orient: vertical; overflow: hidden; }

/* 菜品列表过渡动画 */
.dish-slide-enter-active { transition: all 0.3s ease-out; }
.dish-slide-enter-from { opacity: 0; transform: translateY(12px); }

/* 骨架屏 */
.skeleton { background: white !important; pointer-events: none; overflow: hidden; position: relative; }
.skeleton::after { content: ''; position: absolute; inset: 0; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent); animation: shimmer 1.5s infinite; }
@keyframes shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(100%); } }
.sk-img { width: 90px; height: 80px; background: #e2e8f0; border-radius: 0 var(--radius-sm) var(--radius-sm) 0; flex-shrink: 0; }
.sk-body { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.sk-line { background: #e2e8f0; border-radius: 6px; }
.sk-name { height: 16px; width: 60%; }
.sk-tag { height: 22px; width: 40%; }
.sk-desc { height: 13px; width: 85%; }

/* 详情弹窗 */
.detail-wrap { height: 100%; display: flex; flex-direction: column; overflow: hidden; }
.detail-handle { width: 36px; height: 4px; background: var(--border); border-radius: 2px; margin: 12px auto 0; flex-shrink: 0; }
.detail-media { width: 100%; height: 220px; flex-shrink: 0; }
.bili-player { width: 100%; height: 100%; background: #000; }
.detail-img { width: 100%; height: 100%; object-fit: cover; }
.detail-placeholder { width: 100%; height: 100%; background: linear-gradient(135deg, var(--primary-light), #dbeafe); display: flex; align-items: center; justify-content: center; font-size: 56px; }

.detail-scroll { flex: 1; overflow-y: auto; -webkit-overflow-scrolling: touch; }
.detail-body { padding: var(--space-lg) var(--space-lg) 32px; }
.detail-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; flex-wrap: wrap; }
.detail-name { font-size: 20px; font-weight: 800; color: var(--text1); letter-spacing: -0.3px; }
.detail-desc { font-size: 14px; color: var(--text2); line-height: 1.65; margin-top: 10px; padding-left: 2px; }

.detail-section { margin-top: 22px; }
.section-title {
  font-size: 14px; font-weight: 700; color: var(--text1);
  margin-bottom: 12px; display: flex; align-items: center; gap: 6px;
}
.section-rating-title { justify-content: space-between; }
.section-rating-title .section-title { margin-bottom: 0; }
.rating-avg { font-size: 13px; color: var(--warm-amber); font-weight: 700; background: #fffbeb; padding: 3px 10px; border-radius: 10px; }

.ing-row { display: flex; flex-wrap: wrap; gap: 6px; }
.ing-tag { margin: 0 !important; transition: transform 0.15s; }
.ing-tag:hover { transform: scale(1.05); }

.steps-list { display: flex; flex-direction: column; gap: 10px; }
.step-item {
  display: flex; align-items: flex-start; gap: 12px;
  background: linear-gradient(135deg, #fffbeb, #fef3c7);
  border-radius: var(--radius-md); padding: 14px;
  border-left: 3px solid var(--warm-amber); transition: transform 0.2s;
}
.step-item:hover { transform: translateX(4px); }
.step-badge {
  width: 26px; height: 26px; border-radius: 50%;
  background: linear-gradient(135deg, var(--warm-orange), var(--warm-amber));
  color: white; font-size: 12px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.step-content { font-size: 14px; color: var(--text1); line-height: 1.7; flex: 1; }

/* 关联搭配 */
.bind-sections { display: flex; flex-direction: column; gap: 12px; }
.bind-group-card {
  background: linear-gradient(135deg, #faf5ff, #f3e8ff);
  border-radius: var(--radius-md); padding: 12px 14px;
  border: 1px solid rgba(139,92,246,0.08);
}
.bind-type-header {
  font-size: 13px; font-weight: 700; color: var(--purple);
  margin-bottom: 10px; display: flex; align-items: center; gap: 6px;
}
.bind-cards { display: flex; gap: 8px; overflow-x: auto; -webkit-overflow-scrolling: touch; padding-bottom: 4px; }
.bind-item-card {
  display: flex; align-items: center; gap: 8px;
  background: white; border-radius: 10px;
  padding: 8px 12px; min-width: 120px;
  box-shadow: var(--shadow-sm); cursor: pointer;
  transition: transform 0.15s; flex-shrink: 0; border: 1px solid transparent;
}
.bind-item-card:hover { border-color: var(--purple); transform: translateY(-2px); box-shadow: var(--shadow); }
.bind-item-card:active { transform: scale(0.96); }
.bind-thumb { width: 38px; height: 38px; border-radius: 8px; object-fit: cover; flex-shrink: 0; }
.bind-thumb-placeholder {
  width: 38px; height: 38px; border-radius: 8px;
  background: linear-gradient(135deg, #ede9fe, #ddd6fe);
  display: flex; align-items: center; justify-content: center;
  font-size: 16px; flex-shrink: 0;
}
.bind-info { min-width: 0; }
.bind-name { font-size: 13px; font-weight: 600; color: var(--text1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* 评价区 */
.my-rating-form {
  background: linear-gradient(135deg, #f8fafc, #f1f5f9);
  border-radius: var(--radius-md); padding: 16px; margin-bottom: 16px;
  border: 1px solid var(--border-light);
}
.my-rating-label { font-size: 13px; font-weight: 700; color: #475569; margin-bottom: 12px; }
.rating-field { background: white; border-radius: var(--radius-sm); border: 1.5px solid var(--border); }
.rating-btns { display: flex; gap: 8px; margin-top: 12px; }

.ratings-list { display: flex; flex-direction: column; gap: 12px; }
.rating-item { display: flex; gap: 10px; align-items: flex-start; }
.rating-avatar {
  width: 38px; height: 38px; border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1d4ed8);
  color: white; font-size: 15px; font-weight: 800;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.rating-content { flex: 1; min-width: 0; }
.rating-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.rating-name { font-size: 13px; font-weight: 700; color: var(--text1); }
.rating-comment { font-size: 13px; color: #475569; line-height: 1.55; margin-bottom: 4px; word-break: break-word; }
.rating-time { font-size: 11px; color: var(--text3); }
.no-ratings { font-size: 13px; color: var(--text3); text-align: center; padding: 24px 0; background: #fafafa; border-radius: var(--radius-sm); }
</style>