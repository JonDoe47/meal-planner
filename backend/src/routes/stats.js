const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

router.get('/overview', authMiddleware, async (req, res) => {
  // 支持自定义日期范围，默认近7天
  const customDays = req.query.days ? Number(req.query.days) : null
  const startDate = req.query.startDate
  const endDate = req.query.endDate

  let days = []
  if (startDate && endDate) {
    // 自定义起止日期
    const start = new Date(startDate)
    const end = new Date(endDate)
    const diff = Math.ceil((end - start) / (1000 * 60 * 60 * 24))
    for (let i = 0; i <= diff; i++) {
      const d = new Date(start)
      d.setDate(start.getDate() + i)
      days.push(d.toISOString().split('T')[0])
    }
  } else {
    // 默认近N天（7或自定义）
    const n = customDays && customDays > 0 ? Math.min(customDays, 90) : 7
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push(d.toISOString().split('T')[0])
    }
  }

  if (days.length === 0) return res.status(400).json({ message: '无效的日期范围' })

  const [categories, allDishes, allMealPlans, allRatings] = await Promise.all([
    prisma.category.findMany({ include: { dishes: { select: { id: true } } } }),
    prisma.dish.findMany({ select: { id: true, name: true } }),
    prisma.mealPlan.findMany({
      where: { date: { gte: days[0] } },
      include: { items: true }
    }),
    prisma.dishRating.findMany({ select: { score: true, dishId: true } })
  ])

  // 各分类菜品数（饼图）
  const categoryDist = categories
    .filter(c => c.dishes.length > 0)
    .map(c => ({ name: c.name, value: c.dishes.length }))

  // 近7天点餐趋势（折线图）
  const trendMap = {}
  days.forEach(d => { trendMap[d] = 0 })
  allMealPlans.forEach(plan => {
    if (trendMap[plan.date] !== undefined) {
      trendMap[plan.date] += plan.items.length
    }
  })
  const trend = { dates: days, counts: days.map(d => trendMap[d]) }

  // Top5最受欢迎菜品（按点餐次数）
  const dishCountMap = {}
  allMealPlans.forEach(plan => {
    plan.items.forEach(item => {
      dishCountMap[item.dishId] = (dishCountMap[item.dishId] || 0) + 1
    })
  })
  const dishNameMap = {}
  allDishes.forEach(d => { dishNameMap[d.id] = d.name })
  const topDishes = Object.entries(dishCountMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([dishId, count]) => ({ name: dishNameMap[dishId] || '未知', count }))
    .reverse() // 横向柱状图从小到大

  // 评分分布（1-5星各多少）
  const ratingDist = [0, 0, 0, 0, 0]
  allRatings.forEach(r => {
    if (r.score >= 1 && r.score <= 5) ratingDist[r.score - 1]++
  })

  res.json({ categoryDist, trend, topDishes, ratingDist })
})

module.exports = router
