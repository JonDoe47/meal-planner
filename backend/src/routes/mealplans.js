const router = require('express').Router()
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const prisma = require('../lib/prisma')

const ALLOWED_MEAL_TYPES = new Set(['BREAKFAST', 'LUNCH', 'DINNER'])
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

router.get('/ingredient-badge', adminMiddleware, async (req, res) => {
  const today = new Date().toISOString().split('T')[0]
  try {
    const plans = await prisma.mealPlan.findMany({
      where: { date: today },
      include: { items: { include: { dish: true } } }
    })
    const ingSet = new Set()
    for (const plan of plans) {
      for (const item of plan.items) {
        if (!item.dish.ingredients) continue
        try {
          const arr = JSON.parse(item.dish.ingredients)
          arr.forEach(i => ingSet.add(i))
        } catch {}
      }
    }
    res.json({ count: ingSet.size, date: today })
  } catch {
    res.json({ count: 0, date: today })
  }
})

router.get('/', authMiddleware, async (req, res) => {
  const { startDate, endDate, userId } = req.query
  const where = {}
  if (req.user.role !== 'ADMIN') {
    where.userId = req.user.id
  } else if (userId) {
    where.userId = Number(userId)
  }
  if (startDate && endDate) {
    where.date = { gte: startDate, lte: endDate }
  }

  let plans = await prisma.mealPlan.findMany({
    where,
    include: {
      items: { include: { dish: { include: { category: true } } } },
      user: { select: { id: true, name: true, role: true } }
    },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }]
  })

  if (req.user.role === 'ADMIN') {
    plans.sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1
      if (a.mealType !== b.mealType) return a.mealType < b.mealType ? -1 : 1
      if (a.user.role === 'VIP' && b.user.role !== 'VIP') return -1
      if (b.user.role === 'VIP' && a.user.role !== 'VIP') return 1
      return 0
    })
  }

  res.json(plans)
})

router.post('/', authMiddleware, async (req, res) => {
  const { date, mealType, dishIds } = req.body
  const userId = req.user.id

  if (!DATE_RE.test(date || '')) {
    return res.status(400).json({ message: 'Invalid date' })
  }
  if (!ALLOWED_MEAL_TYPES.has(mealType)) {
    return res.status(400).json({ message: 'Invalid meal type' })
  }
  if (dishIds !== undefined && (!Array.isArray(dishIds) || dishIds.some(id => !Number.isInteger(Number(id))))) {
    return res.status(400).json({ message: 'Invalid dish list' })
  }

  try {
    const plan = await prisma.$transaction(async tx => {
      await tx.mealPlan.deleteMany({ where: { date, mealType, userId } })
      if (!dishIds || dishIds.length === 0) return null

      return tx.mealPlan.create({
        data: {
          date,
          mealType,
          userId,
          items: {
            create: [...new Set(dishIds.map(Number))].map(dishId => ({ dishId }))
          }
        },
        include: { items: { include: { dish: true } } }
      })
    })

    if (!plan) return res.json({ message: 'Meal plan cleared' })
    res.json(plan)
  } catch (e) {
    res.status(400).json({ message: 'Save failed: ' + e.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  const plan = await prisma.mealPlan.findUnique({ where: { id: Number(req.params.id) } })
  if (!plan) return res.status(404).json({ message: 'Meal plan not found' })
  if (plan.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' })
  }
  await prisma.mealPlan.delete({ where: { id: Number(req.params.id) } })
  res.json({ message: 'Deleted' })
})

module.exports = router
