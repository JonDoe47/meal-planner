const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

// 用户提交求菜需求
router.post('/', authMiddleware, async (req, res) => {
  const { dishName, description } = req.body
  if (!dishName?.trim()) return res.status(400).json({ message: '请填写菜品名称' })
  try {
    const request = await prisma.dishRequest.create({
      data: { userId: req.user.id, dishName: dishName.trim(), description: description || null },
      include: { user: { select: { id: true, name: true } } }
    })
    res.json(request)
  } catch (e) {
    res.status(400).json({ message: '提交失败: ' + e.message })
  }
})

// 获取需求列表（管理员看全部，普通用户看自己的）
router.get('/', authMiddleware, async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.id }
  const requests = await prisma.dishRequest.findMany({
    where,
    include: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' }
  })
  res.json(requests)
})

// 管理员处理需求（通过/拒绝）
router.put('/:id', adminMiddleware, async (req, res) => {
  const { status, adminNote } = req.body
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: '状态无效' })
  try {
    const request = await prisma.dishRequest.update({
      where: { id: Number(req.params.id) },
      data: { status, adminNote: adminNote || null },
      include: { user: { select: { id: true, name: true } } }
    })
    res.json(request)
  } catch (e) {
    res.status(400).json({ message: '操作失败' })
  }
})

// 删除需求（管理员或本人）
router.delete('/:id', authMiddleware, async (req, res) => {
  const request = await prisma.dishRequest.findUnique({ where: { id: Number(req.params.id) } })
  if (!request) return res.status(404).json({ message: '记录不存在' })
  if (request.userId !== req.user.id && req.user.role !== 'ADMIN') return res.status(403).json({ message: '无权限' })
  await prisma.dishRequest.delete({ where: { id: Number(req.params.id) } })
  res.json({ message: '删除成功' })
})

module.exports = router
