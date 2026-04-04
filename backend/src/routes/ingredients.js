const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

// 获取指定日期范围的食材汇总（管理员）
router.get('/summary', adminMiddleware, async (req, res) => {
  const { startDate, endDate } = req.query
  if (!startDate || !endDate) return res.status(400).json({ message: '请提供日期范围' })

  const plans = await prisma.mealPlan.findMany({
    where: { date: { gte: startDate, lte: endDate } },
    include: {
      items: { include: { dish: true } },
      user: { select: { id: true, name: true } }
    }
  })

  // 汇总食材：{ ingredientName: { count, dishes: Set, users: Set } }
  const summary = {}
  for (const plan of plans) {
    for (const item of plan.items) {
      const dish = item.dish
      if (!dish.ingredients) continue
      let ingList = []
      try { ingList = JSON.parse(dish.ingredients) } catch { continue }
      for (const ing of ingList) {
        if (!ing.trim()) continue
        const key = ing.trim()
        if (!summary[key]) summary[key] = { name: key, count: 0, dishes: [], users: [] }
        summary[key].count++
        if (!summary[key].dishes.includes(dish.name)) summary[key].dishes.push(dish.name)
        if (!summary[key].users.includes(plan.user.name)) summary[key].users.push(plan.user.name)
      }
    }
  }

  const result = Object.values(summary).sort((a, b) => b.count - a.count)
  res.json(result)
})

// 获取点餐记录中涉及的食材（用户点餐后查看）
router.get('/by-order', authMiddleware, async (req, res) => {
  const { date } = req.query
  if (!date) return res.status(400).json({ message: '请提供日期' })

  const where = { date }
  if (req.user.role !== 'ADMIN') where.userId = req.user.id

  const plans = await prisma.mealPlan.findMany({
    where,
    include: { items: { include: { dish: true } } }
  })

  const mealTypeLabel = { BREAKFAST: '早餐', LUNCH: '午餐', DINNER: '晚餐' }
  const result = plans.map(plan => ({
    mealType: plan.mealType,
    mealLabel: mealTypeLabel[plan.mealType] || plan.mealType,
    dishes: plan.items.map(item => ({
      name: item.dish.name,
      ingredients: item.dish.ingredients ? (() => { try { return JSON.parse(item.dish.ingredients) } catch { return [] } })() : []
    }))
  }))

  res.json(result)
})

module.exports = router
