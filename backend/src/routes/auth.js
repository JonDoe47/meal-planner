const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')
const rateLimit = require('express-rate-limit')
const prisma = require('../lib/prisma')
const { validateDisplayName } = require('../utils/validation')

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('[FATAL] JWT_SECRET is not configured')
  process.exit(1)
}

const loginRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many login attempts, please try again later' }
})

const qrRegisterRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many registration attempts, please try again later' }
})

function signUserToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, name: user.name, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  )
}

router.post('/login', loginRateLimiter, async (req, res) => {
  const { username, password } = req.body

  if (!username || typeof username !== 'string' || username.trim().length === 0) {
    return res.status(400).json({ message: 'Please enter username' })
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({ message: 'Please enter password' })
  }

  try {
    const user = await prisma.user.findUnique({ where: { username: username.trim() } })
    if (!user) return res.status(401).json({ message: 'Invalid username or password' })

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: 'Invalid username or password' })

    if (user.status === 'PENDING') return res.status(403).json({ message: 'Account is pending approval' })
    if (user.status === 'REJECTED') return res.status(403).json({ message: 'Account was rejected' })

    const token = signUserToken(user)
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch {
    res.status(500).json({ message: 'Server error' })
  }
})

router.post('/qr/generate', async (req, res) => {
  try {
    await prisma.qrSession.deleteMany({ where: { expiresAt: { lt: new Date() } } })

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)
    await prisma.qrSession.create({ data: { token, expiresAt } })
    res.json({ token, expiresAt })
  } catch (e) {
    res.status(500).json({ message: 'Generate failed: ' + e.message })
  }
})

router.get('/qr/poll/:token', async (req, res) => {
  try {
    const session = await prisma.qrSession.findUnique({ where: { token: req.params.token } })
    if (!session) return res.status(404).json({ message: 'QR session not found' })
    if (session.expiresAt < new Date()) return res.json({ status: 'EXPIRED' })
    if (session.status === 'APPROVED') {
      return res.json({ status: 'APPROVED', token: session.jwtToken })
    }
    res.json({ status: session.status })
  } catch {
    res.status(500).json({ message: 'Query failed' })
  }
})

router.post('/qr/register', qrRegisterRateLimiter, async (req, res) => {
  const { token, name } = req.body

  const nameCheck = validateDisplayName(name)
  if (!nameCheck.valid) {
    return res.status(400).json({ message: nameCheck.message })
  }

  try {
    const session = await prisma.qrSession.findUnique({ where: { token } })
    if (!session) return res.status(404).json({ message: 'QR session not found' })
    if (session.expiresAt < new Date()) return res.status(400).json({ message: 'QR session expired' })
    if (session.status !== 'WAITING') return res.status(400).json({ message: 'QR session already used' })

    const username = 'wechat_' + Date.now()
    const password = await bcrypt.hash(crypto.randomUUID(), 10)
    const user = await prisma.user.create({
      data: { username, password, name: name.trim(), status: 'PENDING' }
    })
    await prisma.qrSession.update({ where: { token }, data: { status: 'SCANNED', userId: user.id } })
    res.json({ message: 'Registration submitted, pending approval' })
  } catch (e) {
    res.status(500).json({ message: 'Submit failed: ' + e.message })
  }
})

module.exports = router
