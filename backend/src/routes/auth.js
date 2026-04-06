const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const { PrismaClient } = require('@prisma/client')
const rateLimit = require('express-rate-limit')
const { validateUsername, validatePassword, validateDisplayName } = require('../utils/validation')

const prisma = new PrismaClient()

// JWT_SECRET 必须从环境变量读取，不允许使用硬编码默认值
const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET 环境变量未设置，拒绝启动！')
  process.exit(1)
}

// 登录接口频率限制：同一 IP 5 分钟内最多 10 次
const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true, // 成功登录不计入限制
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '登录请求过于频繁，请 5 分钟后再试' }
})

// 二维码注册频率限制：同一 IP 1 小时内最多 5 次
const qrRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: '注册请求过于频繁，请稍后再试' }
})

// 密码登录
router.post('/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body

  // 基础格式校验（防止空值注入）
  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ message: '请填写用户名' })
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ message: '请填写密码' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: username.trim() } })
    if (!user) return res.status(401).json({ message: '用户名或密码错误' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: '用户名或密码错误' })

    if (user.status === 'PENDING') return res.status(403).json({ message: '账号待管理员审批，请稍候' })
    if (user.status === 'REJECTED') return res.status(403).json({ message: '账号审批未通过' })

    const token = jwt.sign(
      { id: user.id, username: user.username, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    )
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

// 手机端扫码后提交注册（有频率限制）
router.post('/qr/register', qrRegisterRateLimiter, async (req, res) => {
  const { token, name } = req.body

  // 姓名格式校验
  const nameCheck = validateDisplayName(name)
  if (!nameCheck.valid) {
    return res.status(400).json({ message: nameCheck.message })
  }

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
