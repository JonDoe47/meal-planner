const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const { validateUsername, validatePassword, validateDisplayName } = require('../utils/validation')

const prisma = new PrismaClient()

const JWT_SECRET = process.env.JWT_SECRET

// 获取所有活跃用户（管理员）
router.get('/', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true }
  })
  res.json(users)
})

// 管理员创建用户（含严格格式校验）
router.post('/', adminMiddleware, async (req, res) => {
  const { username, password, name, role } = req.body

  // 用户名校验
  const usernameCheck = validateUsername(username)
  if (!usernameCheck.valid) {
    return res.status(400).json({ message: usernameCheck.message })
  }

  // 密码校验
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    return res.status(400).json({ message: passwordCheck.message })
  }

  // 显示名称校验
  const nameCheck = validateDisplayName(name)
  if (!nameCheck.valid) {
    return res.status(400).json({ message: nameCheck.message })
  }

  // 角色白名单
  const allowedRoles = ['USER', 'VIP', 'ADMIN']
  const finalRole = allowedRoles.includes(role) ? role : 'USER'

  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username: username.trim(), password: hashed, name: name.trim(), role: finalRole },
      select: { id: true, username: true, name: true, role: true }
    })
    res.json(user)
  } catch (e) {
    res.status(400).json({ message: '用户名已存在' })
  }
})

// 编辑用户信息（管理员：姓名、登录账号可选修改；密码可选修改）
router.put('/:id', adminMiddleware, async (req, res) => {
  const { name, username, password } = req.body
  const data = {}

  if (name !== undefined) {
    const nameCheck = validateDisplayName(name)
    if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message })
    data.name = name.trim()
  }

  if (username !== undefined) {
    const usernameCheck = validateUsername(username)
    if (!usernameCheck.valid) return res.status(400).json({ message: usernameCheck.message })
    data.username = username.trim()
  }

  if (password !== undefined && password !== '') {
    const passwordCheck = validatePassword(password)
    if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })
    data.password = await bcrypt.hash(password, 10)
  }

  if (Object.keys(data).length === 0) {
    return res.status(400).json({ message: '没有需要更新的内容' })
  }

  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data })
    res.json({ message: '更新成功' })
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ message: '该登录账号已被使用' })
    res.status(500).json({ message: '更新失败: ' + e.message })
  }
})

// 重置密码（管理员权限，含新密码格式校验）
router.put('/:id/reset-password', adminMiddleware, async (req, res) => {
  const { password } = req.body
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) {
    return res.status(400).json({ message: passwordCheck.message })
  }
  try {
    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } })
    res.json({ message: '密码重置成功' })
  } catch (e) {
    res.status(500).json({ message: '操作失败' })
  }
})

// 删除用户（不能删除自己）
router.delete('/:id', adminMiddleware, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: '不能删除自己' })
  }
  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: '删除成功' })
  } catch (e) {
    res.status(500).json({ message: '删除失败' })
  }
})

// 设置角色（管理员，支持 USER / VIP / ADMIN）
router.put('/:id/set-role', adminMiddleware, async (req, res) => {
  const { role } = req.body
  const allowedRoles = ['USER', 'VIP', 'ADMIN']
  if (!allowedRoles.includes(role)) return res.status(400).json({ message: '无效角色' })
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: '不能修改自己的角色' })
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role } })
    res.json({ message: '角色已更新' })
  } catch (e) {
    res.status(500).json({ message: '操作失败: ' + e.message })
  }
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
      const token = jwt.sign(
        { id: user.id, username: user.username, name: user.name, role: user.role },
        JWT_SECRET,
        { expiresIn: '7d' }
      )
      await prisma.qrSession.update({
        where: { id: session.id },
        data: { status: 'APPROVED', jwtToken: token }
      })
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
    await prisma.qrSession.updateMany({
      where: { userId: Number(req.params.id) },
      data: { status: 'REJECTED' }
    })
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
