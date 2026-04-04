<template>
  <div class="admin-layout">
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar v-model="active" active-color="#2563eb" inactive-color="#94a3b8" @change="onTabChange">
      <van-tabbar-item icon="chart-trending-o" name="dashboard">概览</van-tabbar-item>
      <van-tabbar-item icon="records-o" name="dishes">菜品</van-tabbar-item>
      <van-tabbar-item icon="comment-o" name="dish-requests" :badge="pendingCount || ''">需求</van-tabbar-item>
      <van-tabbar-item icon="bag-o" name="ingredients" :badge="ingredientBadge || ''">食材</van-tabbar-item>
      <van-tabbar-item icon="friends-o" name="users">成员</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { dishRequestApi, mealApi } from '../../api'

const router = useRouter()
const route = useRoute()
const active = ref('dashboard')
const pendingCount = ref(0)
const ingredientBadge = ref(0)
let badgeTimer = null

watch(() => route.path, (path) => {
  const name = path.split('/')[2] || 'dashboard'
  active.value = name
  // 打开食材页时清除 badge
  if (name === 'ingredients') ingredientBadge.value = 0
}, { immediate: true })

function onTabChange(name) { router.push(`/admin/${name}`) }

async function loadPendingCount() {
  try {
    const list = await dishRequestApi.list()
    pendingCount.value = list.filter(r => r.status === 'PENDING').length
  } catch {}
}

async function loadIngredientBadge() {
  try {
    const { count } = await mealApi.ingredientBadge()
    if (active.value !== 'ingredients') ingredientBadge.value = count
  } catch {}
}

onMounted(() => {
  loadPendingCount()
  loadIngredientBadge()
  badgeTimer = setInterval(loadIngredientBadge, 30000)
})

onUnmounted(() => { if (badgeTimer) clearInterval(badgeTimer) })
</script>

<style scoped>
.admin-layout { display: flex; flex-direction: column; min-height: 100vh; }
.page-content { flex: 1; padding-bottom: 60px; }
</style>
