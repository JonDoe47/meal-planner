const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

// 获取某菜品的所有评价
router.get('/dish/:dishId', authMiddleware, async (req, res) => {
  const dishId = Number(req.params.dishId)
  const ratings = await prisma.dishRating.findMany({
    where: { dishId },
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json(ratings)
})

// 创建或更新评价（每人每菜只能评一次）
router.post('/', authMiddleware, async (req, res) => {
  const { dishId, score, comment } = req.body
  if (!dishId || !score || score < 1 || score > 5) {
    return res.status(400).json({ message: '评分必须在1-5之间' })
  }
  try {
    const rating = await prisma.dishRating.upsert({
      where: { dishId_userId: { dishId: Number(dishId), userId: req.user.id } },
      update: { score: Number(score), comment: comment || null },
      create: { dishId: Number(dishId), userId: req.user.id, score: Number(score), comment: comment || null },
      include: { user: { select: { id: true, name: true } } }
    })
    res.json(rating)
  } catch (e) {
    res.status(400).json({ message: '评价失败: ' + e.message })
  }
})

// 删除自己的评价
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const rating = await prisma.dishRating.findUnique({ where: { id: Number(req.params.id) } })
    if (!rating) return res.status(404).json({ message: '评价不存在' })
    if (rating.userId !== req.user.id) return res.status(403).json({ message: '无权删除' })
    await prisma.dishRating.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: '删除成功' })
  } catch (e) {
    res.status(400).json({ message: '删除失败' })
  }
})

module.exports = router
