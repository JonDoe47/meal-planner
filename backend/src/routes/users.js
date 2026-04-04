const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

router.get('/', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({ select: { id: true, username: true, name: true, role: true, createdAt: true } })
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

module.exports = router
