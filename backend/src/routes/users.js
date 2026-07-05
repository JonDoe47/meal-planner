const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { adminMiddleware } = require('../middleware/auth')
const { validateUsername, validatePassword, validateDisplayName } = require('../utils/validation')
const prisma = require('../lib/prisma')

const JWT_SECRET = process.env.JWT_SECRET
const ALLOWED_ROLES = ['USER', 'VIP', 'ADMIN']

router.get('/', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true, username: true, name: true, role: true, status: true, createdAt: true }
  })
  res.json(users)
})

router.post('/', adminMiddleware, async (req, res) => {
  const { username, password, name, role } = req.body

  const usernameCheck = validateUsername(username)
  if (!usernameCheck.valid) return res.status(400).json({ message: usernameCheck.message })

  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })

  const nameCheck = validateDisplayName(name)
  if (!nameCheck.valid) return res.status(400).json({ message: nameCheck.message })

  const finalRole = ALLOWED_ROLES.includes(role) ? role : 'USER'

  try {
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({
      data: { username: username.trim(), password: hashed, name: name.trim(), role: finalRole },
      select: { id: true, username: true, name: true, role: true }
    })
    res.json(user)
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ message: 'Username already exists' })
    res.status(400).json({ message: 'Create failed: ' + e.message })
  }
})

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
    return res.status(400).json({ message: 'No changes provided' })
  }

  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data })
    res.json({ message: 'Updated' })
  } catch (e) {
    if (e.code === 'P2002') return res.status(400).json({ message: 'Username already exists' })
    res.status(500).json({ message: 'Update failed: ' + e.message })
  }
})

router.put('/:id/reset-password', adminMiddleware, async (req, res) => {
  const { password } = req.body
  const passwordCheck = validatePassword(password)
  if (!passwordCheck.valid) return res.status(400).json({ message: passwordCheck.message })

  try {
    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { password: hashed } })
    res.json({ message: 'Password reset' })
  } catch {
    res.status(500).json({ message: 'Operation failed' })
  }
})

router.delete('/:id', adminMiddleware, async (req, res) => {
  if (Number(req.params.id) === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete yourself' })
  }

  try {
    await prisma.user.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: 'Deleted' })
  } catch {
    res.status(500).json({ message: 'Delete failed' })
  }
})

router.put('/:id/set-role', adminMiddleware, async (req, res) => {
  const { role } = req.body
  if (!ALLOWED_ROLES.includes(role)) return res.status(400).json({ message: 'Invalid role' })
  if (Number(req.params.id) === req.user.id) return res.status(400).json({ message: 'Cannot change your own role' })

  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { role } })
    res.json({ message: 'Role updated' })
  } catch (e) {
    res.status(500).json({ message: 'Operation failed: ' + e.message })
  }
})

router.put('/:id/approve', adminMiddleware, async (req, res) => {
  try {
    const user = await prisma.user.update({
      where: { id: Number(req.params.id) },
      data: { status: 'ACTIVE' }
    })

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
    res.json({ message: 'Approved' })
  } catch (e) {
    res.status(500).json({ message: 'Operation failed: ' + e.message })
  }
})

router.put('/:id/reject', adminMiddleware, async (req, res) => {
  try {
    await prisma.user.update({ where: { id: Number(req.params.id) }, data: { status: 'REJECTED' } })
    await prisma.qrSession.updateMany({
      where: { userId: Number(req.params.id) },
      data: { status: 'REJECTED' }
    })
    res.json({ message: 'Rejected' })
  } catch (e) {
    res.status(500).json({ message: 'Operation failed: ' + e.message })
  }
})

router.get('/pending', adminMiddleware, async (req, res) => {
  const users = await prisma.user.findMany({
    where: { status: 'PENDING' },
    select: { id: true, username: true, name: true, role: true, createdAt: true, status: true }
  })
  res.json(users)
})

module.exports = router
