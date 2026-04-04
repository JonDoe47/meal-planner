<template>
  <div class="admin-layout">
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar v-model="active" active-color="#ff6b35" @change="onTabChange">
      <van-tabbar-item icon="chart-trending-o" name="dashboard">概览</van-tabbar-item>
      <van-tabbar-item icon="food-o" name="dishes">菜品</van-tabbar-item>
      <van-tabbar-item icon="apps-o" name="categories">分类</van-tabbar-item>
      <van-tabbar-item icon="orders-o" name="orders">点餐</van-tabbar-item>
      <van-tabbar-item icon="friends-o" name="users">成员</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const active = ref('dashboard')

watch(() => route.path, (path) => {
  const seg = path.split('/')[2]
  active.value = seg || 'dashboard'
}, { immediate: true })

function onTabChange(name) { router.push(`/admin/${name}`) }
</script>

<style scoped>
.admin-layout { display: flex; flex-direction: column; min-height: 100vh; }
.page-content { flex: 1; padding-bottom: 60px; }
</style>
