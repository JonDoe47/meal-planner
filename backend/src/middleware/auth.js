const jwt = require('jsonwebtoken')

// JWT_SECRET 统一从环境变量读取，启动时已由 routes/auth.js 强制校验
// 此处保持一致，使用相同来源
const JWT_SECRET = process.env.JWT_SECRET

function authMiddleware(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ message: '未登录' })
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    res.status(401).json({ message: 'Token无效或已过期' })
  }
}

function adminMiddleware(req, res, next) {
  authMiddleware(req, res, () => {
    if (req.user.role !== 'ADMIN') return res.status(403).json({ message: '无权限' })
    next()
  })
}

module.exports = { authMiddleware, adminMiddleware }
