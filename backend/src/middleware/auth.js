const jwt = require('jsonwebtoken')

const JWT_SECRET = process.env.JWT_SECRET || 'meal-planner-secret-key-2024'

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未登录' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token无效' })
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: '无权限' })
    next()
  })
}

module.exports = { authMiddleware, adminMiddleware }
