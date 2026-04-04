import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'

const routes = [
  { path: '/login', component: () => import('../views/Login.vue') },
  {
    path: '/',
    component: () => import('../views/user/Layout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: '/home' },
      { path: 'home', component: () => import('../views/user/Home.vue') },
      { path: 'order', component: () => import('../views/user/Order.vue') },
      { path: 'dishes', component: () => import('../views/user/Dishes.vue') },
      { path: 'my-orders', component: () => import('../views/user/MyOrders.vue') }
    ]
  },
  {
    path: '/admin',
    component: () => import('../views/admin/Layout.vue'),
    meta: { requiresAuth: true, requiresAdmin: true },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      { path: 'dashboard', component: () => import('../views/admin/Dashboard.vue') },
      { path: 'dishes', component: () => import('../views/admin/DishManage.vue') },
      { path: 'categories', component: () => import('../views/admin/CategoryManage.vue') },
      { path: 'orders', component: () => import('../views/admin/OrderStats.vue') },
      { path: 'users', component: () => import('../views/admin/UserManage.vue') }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isLoggedIn) return next('/login')
  if (to.meta.requiresAdmin && !auth.isAdmin) return next('/home')
  if (to.path === '/login' && auth.isLoggedIn) return next(auth.isAdmin ? '/admin' : '/home')
  next()
})

export default router
