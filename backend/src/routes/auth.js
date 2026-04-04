const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const { authMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'meal-planner-secret-key-2024'

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(401).json({ message: '用户名或密码错误' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: '用户名或密码错误' })
    if (user.status === 'PENDING') return res.status(403).json({ message: '账号待管理员审批，请稍候' })
    if (user.status === 'REJECTED') return res.status(403).json({ message: '账号审批未通过' })
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ message: '服务器错误' })
  }
})

// 生成二维码 session
router.post('/qr/generate', async (req, res) => {
  try {
    // 清理过期 session
    await prisma.qrSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10分钟有效
    await prisma.qrSession.create({ data: { token, expiresAt } })
    res.json({ token, expiresAt })
  } catch (e) {
    res.status(500).json({ message: '生成失败: ' + e.message })
  }
})

// 轮询二维码状态（桌面端）
router.get('/qr/poll/:token', async (req, res) => {
  try {
    const session = await prisma.qrSession.findUnique({ where: { token: req.params.token } })
    if (!session) return res.status(404).json({ message: '二维码无效' })
    if (session.expiresAt < new Date()) return res.json({ status: 'EXPIRED' })
    if (session.status === 'APPROVED') {
      return res.json({ status: 'APPROVED', token: session.jwtToken })
    }
    res.json({ status: session.status })
  } catch (e) {
    res.status(500).json({ message: '查询失败' })
  }
})

// 手机端扫码后提交注册
router.post('/qr/register', async (req, res) => {
  const { token, name } = req.body
  if (!token || !name?.trim()) return res.status(400).json({ message: '请填写姓名' })
  try {
    const session = await prisma.qrSession.findUnique({ where: { token } })
    if (!session) return res.status(404).json({ message: '二维码无效' })
    if (session.expiresAt < new Date()) return res.status(400).json({ message: '二维码已过期，请重新扫码' })
    if (session.status !== 'WAITING') return res.status(400).json({ message: '该二维码已被使用' })

    const username = 'wechat_' + Date.now()
    const password = await bcrypt.hash(crypto.randomUUID(), 10)
    const user = await prisma.user.create({
      data: { username, password, name: name.trim(), status: 'PENDING' }
    })
    await prisma.qrSession.update({ where: { token }, data: { status: 'SCANNED', userId: user.id } })
    res.json({ message: '注册申请已提交，等待管理员审批' })
  } catch (e) {
    res.status(500).json({ message: '提交失败: ' + e.message })
  }
})

module.exports = router
