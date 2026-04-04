<template>
  <div class="admin-layout">
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar v-model="active" active-color="#2563eb" inactive-color="#94a3b8" @change="onTabChange">
      <van-tabbar-item icon="chart-trending-o" name="dashboard">概览</van-tabbar-item>
      <van-tabbar-item icon="food-o" name="dishes">菜品</van-tabbar-item>
      <van-tabbar-item icon="comment-o" name="dish-requests" :badge="pendingCount || ''">需求</van-tabbar-item>
      <van-tabbar-item icon="bag-o" name="ingredients">食材</van-tabbar-item>
      <van-tabbar-item icon="friends-o" name="users">成员</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { dishRequestApi } from '../../api'

const router = useRouter()
const route = useRoute()
const active = ref('dashboard')
const pendingCount = ref(0)

watch(() => route.path, (path) => {
  active.value = path.split('/')[2] || 'dashboard'
}, { immediate: true })

function onTabChange(name) { router.push(`/admin/${name}`) }

async function loadPendingCount() {
  try {
    const list = await dishRequestApi.list()
    pendingCount.value = list.filter(r => r.status === 'PENDING').length
  } catch {}
}

onMounted(loadPendingCount)
</script>

<style scoped>
.admin-layout { display: flex; flex-direction: column; min-height: 100vh; }
.page-content { flex: 1; padding-bottom: 60px; }
</style>
