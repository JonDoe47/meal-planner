<template>
  <router-view v-slot="{ Component }">
    <transition name="page-fade" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
:root {
  /* === 主色系 === */
  --primary: #2563eb;
  --primary-dark: #1d4ed8;
  --primary-light: #eff6ff;
  --primary-mid: #bfdbfe;
  
  /* === 暖色调辅助（家庭/美食感）=== */
  --warm-orange: #f97316;
  --warm-amber: #f59e0b;
  --warm-red: #ef4444;
  --success-green: #22c55e;
  --purple: #8b5cf6;

  /* === 中性色 === */
  --bg: #f5f7fa;
  --card: #ffffff;
  --text1: #1e293b;
  --text2: #64748b;
  --text3: #94a3b8;
  --border: #e2e8f0;
  --border-light: #f1f5f9;

  /* === 阴影 === */
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --shadow: 0 2px 12px rgba(37,99,235,0.08);
  --shadow-md: 0 4px 20px rgba(37,99,235,0.10);
  --shadow-lg: 0 8px 30px rgba(37,99,235,0.12);

  /* === 圆角 === */
  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
  --radius-full: 9999px;

  /* === 间距 === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 12px;
  --space-lg: 16px;
  --space-xl: 20px;
  --space-2xl: 28px;

  /* === 字号 === */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-lg: 18px;
  --text-xl: 20px;
  --text-xxl: 26px;

  /* Vant 覆盖 */
  --van-primary-color: #2563eb;
  --van-button-primary-background: #2563eb;
  --van-button-primary-border-color: #2563eb;
  --van-tabbar-item-active-color: #2563eb;
  --van-tab-active-text-color: #2563eb;
  --van-tabs-bottom-bar-color: #2563eb;
  --van-nav-bar-icon-color: #2563eb;
  --van-nav-bar-text-color: #2563eb;
  --van-switch-on-background: #2563eb;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif;
  background: var(--bg);
  color: var(--text1);
  -webkit-font-smoothing: antialiased;
}

/* ===== 全局页面转场动画 ===== */
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.page-fade-enter-from {
  opacity: 0;
  transform: translateY(8px);
}
.page-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* ===== 底部弹窗通用入场 ===== */
.van-popup--bottom {
  border-radius: var(--radius-xl) var(--radius-xl) 0 0 !important;
}

/* ===== 滚动条美化 ===== */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
::-webkit-scrollbar-track { background: transparent; }

/* ===== 餐型 Badge 统一配色类 ===== */
.badge-breakfast { background: linear-gradient(135deg, #fef3c7, #fde68a); color: #d97706; }
.badge-lunch { background: linear-gradient(135deg, #dcfce7, #bbf7d0); color: #16a34a; }
.badge-dinner { background: linear-gradient(135deg, #ede9fe, #ddd6fe); color: #7c3aed; }

/* ===== 状态 Badge 统一 === */
.status-pending { background: #fef3c7; color: #d97706; }
.status-approved { background: #dcfce7; color: #16a34a; }
.status-rejected { background: #fee2e2; color: #ef4444; }
</style>
