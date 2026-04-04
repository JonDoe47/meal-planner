const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

router.get('/', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true }
  })
  res.json(users)
})

router.post('/', adminMiddleware, async (req, res) => {
  const { username, password, name, role } = req.body
  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { username, password: hashed, name, role: role || 'USER' }, select: { id: true, username: true, name: true, role: true } })
    res.json(user)
  } catch (e) {
    res.status(400).json({ message: '用户名已存在' })
  }
})

// 编辑用户信息（姓名、登录账号、密码可选）
router.put('/:id', adminMiddleware, async (req, res) => {
  const { name, username, password } = req.body
  try {
    const data = {}
    if (name?.trim()) data.name = name.trim()
    if (username?.trim()) data.username = username.trim()
    if (password?.trim()) data.password = await bcrypt.hash(password.trim(), 10)
    if (Object.keys(data).length === 0) return res.status(400).json({ message: '没有需要更新的内容' })
    await prisma.user.update({ where: { id: Number(req.params.id) }, data })
    res.json({ message: '更新成功' })
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ message: '该登录账号已被使用' })
    res.status(500).json({ message: '更新失败: ' + e.message })
  }
})

router.put('/:id/reset-password', adminMiddleware, async (req, res) => {
  const { password } = req.body
  const hashed = await bcrypt.hash(password, 10)
  await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } })
  res.json({ message: '密码重置成功' })
})

router.delete('/:id', adminMiddleware, async (req, res) => {
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: '不能删除自己' })
  await prisma.user.delete({ where: { id: Number(req.params.id) } })
  res.json({ message: '删除成功' })
})

// 审批通过
router.put('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { status: 'ACTIVE' }
    })
    // 找到对应的 QrSession，生成 JWT 并标记为 APPROVED
    const session = await prisma.qrSession.findFirst({
      where: { userId: user.id, status: 'SCANNED' }
    })
    if (session) {
      const jwt = require('jsonwebtoken')
      const JWT_SECRET = process.env.JWT_SECRET || 'meal-planner-secret-key-2024'
      const token = jwt.sign(
        { id: user.id, username: user.username, name: user.name, role: user.role },
        JWT_SECRET, { expiresIn: '7d' }
      )
      await prisma.qrSession.update({ where: { id: session.id }, data: { status: 'APPROVED', jwtToken: token } })
    }
    res.json({ message: '审批通过' })
  } catch (e) {
    res.status(500).json({ message: '操作失败: ' + e.message })
  }
})

// 审批拒绝
router.put('/:id/reject', adminMiddleware, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: 'REJECTED' } })
    await prisma.qrSession.updateMany({ where: { userId: Number(req.params.id) }, data: { status: 'REJECTED' } })
    res.json({ message: '已拒绝' })
  } catch (e) {
    res.status(500).json({ message: '操作失败: ' + e.message })
  }
})

// 获取待审批用户列表
router.get('/pending', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'PENDING' },
    select: { id: true, username: true, name: true, role: true, createdAt: true, status: true }
  })
  res.json(users)
})

module.exports = router
