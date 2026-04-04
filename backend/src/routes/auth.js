const router = require('express').Router()
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()
const JWT_SECRET = process.env.JWT_SECRET || 'meal-planner-secret-key-2024'

router.post('/login', async (req, res) => {
  const { username, password } = req.body
  try {
    const user = await prisma.user.findUnique({ where: { username } })
    if (!user) return res.status(401).json({ message: '用户名或密码错误' })
    const valid = await bcrypt.compare(password, user.password)
    if (!valid) return res.status(401).json({ message: '用户名或密码错误' })
    const token = jwt.sign({ id: user.id, username: user.username, name: user.name, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    res.json({ token, user: { id: user.id, username: user.username, name: user.name, role: user.role } })
  } catch (e) {
    res.status(500).json({ message: '服务器错误' })
  }
})

module.exports = router
