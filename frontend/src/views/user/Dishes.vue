<template>
  <div class="dishes-page">
    <van-nav-bar title="菜品浏览" />
    <div class="category-bar">
      <van-tabs v-model:active="activeCategory" color="#ff6b35" shrink sticky>
        <van-tab title="全部" name="all" />
        <van-tab v-for="cat in categories" :key="cat.id" :title="cat.name" :name="cat.id" />
      </van-tabs>
    </div>

    <div class="dish-list">
      <div v-for="dish in filteredDishes" :key="dish.id" class="dish-item" @click="openDish(dish)">
        <div class="dish-img-wrap">
          <img v-if="dish.imageUrl" :src="dish.imageUrl" class="dish-img" />
          <div v-else class="dish-placeholder">🍽️</div>
        </div>
        <div class="dish-info">
          <div class="dish-name">{{ dish.name }}</div>
          <div class="dish-meta">
            <van-tag type="primary" plain size="small">{{ dish.category.name }}</van-tag>
            <van-tag v-if="dish.bvid" type="danger" plain size="small" style="margin-left: 4px">B站视频</van-tag>
          </div>
          <div class="dish-desc" v-if="dish.description">{{ dish.description }}</div>
        </div>
      </div>
    </div>

    <!-- 菜品详情弹窗 -->
    <van-popup v-model:show="showDetail" position="bottom" :style="{ height: '85%', borderRadius: '16px 16px 0 0' }">
      <div class="detail-content" v-if="currentDish">
        <div class="detail-header">
          <span class="detail-title">{{ currentDish.name }}</span>
          <van-icon name="cross" @click="showDetail = false" />
        </div>
        <div class="detail-img-wrap" v-if="currentDish.imageUrl && !currentDish.bvid">
          <img :src="currentDish.imageUrl" class="detail-img" />
        </div>
        <div class="bili-player" v-if="currentDish.bvid">
          <iframe
            :src="`https://player.bilibili.com/player.html?bvid=${currentDish.bvid}&page=1&high_quality=1&danmaku=0`"
            scrolling="no" frameborder="0" allowfullscreen
            style="width:100%;height:100%"
          ></iframe>
        </div>
        <div class="detail-meta">
          <van-tag type="primary" plain>{{ currentDish.category.name }}</van-tag>
        </div>
        <div class="detail-desc" v-if="currentDish.description">{{ currentDish.description }}</div>
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

const filteredDishes = computed(() => {
  if (activeCategory.value === 'all') return dishes.value
  return dishes.value.filter(d => d.categoryId === activeCategory.value)
})

function openDish(dish) {
  currentDish.value = dish
  showDetail.value = true
}

onMounted(async () => {
  categories.value = await categoryApi.list()
  dishes.value = await dishApi.list()
})
</script>

<style scoped>
.dishes-page { padding-bottom: 60px; }
.dish-list { padding: 12px; display: flex; flex-direction: column; gap: 10px; }
.dish-item { display: flex; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.dish-img-wrap { width: 100px; height: 90px; flex-shrink: 0; }
.dish-img { width: 100%; height: 100%; object-fit: cover; }
.dish-placeholder { width: 100%; height: 100%; background: #f5f5f5; display: flex; align-items: center; justify-content: center; font-size: 32px; }
.dish-info { padding: 12px; flex: 1; }
.dish-name { font-weight: 600; font-size: 15px; margin-bottom: 6px; }
.dish-meta { margin-bottom: 6px; }
.dish-desc { font-size: 12px; color: #999; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.detail-content { height: 100%; overflow-y: auto; }
.detail-header { display: flex; justify-content: space-between; align-items: center; padding: 16px; font-size: 18px; font-weight: 700; }
.detail-img-wrap { width: 100%; height: 220px; }
.detail-img { width: 100%; height: 100%; object-fit: cover; }
.bili-player { width: 100%; height: 220px; background: #000; }
.detail-meta { padding: 12px 16px 0; }
.detail-desc { padding: 12px 16px; color: #666; font-size: 14px; line-height: 1.6; }
</style>
