const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

// 今日食材 badge 数量（管理员用）
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
        if (item.dish.ingredients) {
          try {
            const arr = JSON.parse(item.dish.ingredients)
            arr.forEach(i => ingSet.add(i))
          } catch {}
        }
      }
    }
    res.json({ count: ingSet.size, date: today })
  } catch (e) {
    res.json({ count: 0 })
  }
})

// 获取指定日期范围的点餐（当前用户）
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
  const plans = await prisma.mealPlan.findMany({
    where,
    include: { items: { include: { dish: { include: { category: true } } } }, user: { select: { id: true, name: true } } },
    orderBy: [{ date: 'asc' }, { mealType: 'asc' }]
  })
  res.json(plans)
})

// 保存点餐（覆盖式，同一天同餐次）
router.post('/', authMiddleware, async (req, res) => {
  const { date, mealType, dishIds } = req.body
  const userId = req.user.id
  try {
    // 删除旧的
    const old = await prisma.mealPlan.findFirst({ where: { date, mealType, userId } })
    if (old) {
      await prisma.mealPlan.delete({ where: { id: old.id } })
    }
    if (!dishIds || dishIds.length === 0) {
      return res.json({ message: '已清除该餐次' })
    }
    const plan = await prisma.mealPlan.create({
      data: {
        date, mealType, userId,
        items: { create: dishIds.map(dishId => ({ dishId })) }
      },
      include: { items: { include: { dish: true } } }
    })
    res.json(plan)
  } catch (e) {
    res.status(400).json({ message: '保存失败: ' + e.message })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  const plan = await prisma.mealPlan.findUnique({ where: { id: Number(req.params.id) } })
  if (!plan) return res.status(404).json({ message: '记录不存在' })
  if (plan.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ message: '无权限' })
  await prisma.mealPlan.delete({ where: { id: Number(req.params.id) } })
  res.json({ message: '删除成功' })
})

module.exports = router
