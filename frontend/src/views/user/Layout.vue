<template>
  <div class="layout">
    <div class="page-content">
      <router-view />
    </div>
    <van-tabbar v-model="active" active-color="#2563eb" inactive-color="#94a3b8" @change="onTabChange" class="custom-tabbar">
      <van-tabbar-item icon="home-o" name="home">首页</van-tabbar-item>
      <van-tabbar-item icon="apps-o" name="order">点餐</van-tabbar-item>
      <van-tabbar-item icon="records-o" name="dishes">菜品</van-tabbar-item>
      <van-tabbar-item icon="clock-o" name="my-orders">我的</van-tabbar-item>
    </van-tabbar>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()
const active = ref('home')

watch(() => route.path, (path) => {
  const name = path.split('/')[1]
  active.value = name || 'home'
}, { immediate: true })

function onTabChange(name) { router.push(`/${name}`) }
</script>

<style scoped>
.layout { display: flex; flex-direction: column; min-height: 100vh; }
.page-content { flex: 1; padding-bottom: 60px; }
:deep(.custom-tabbar) {
  box-shadow: 0 -1px 0 #e2e8f0;
}
</style>
