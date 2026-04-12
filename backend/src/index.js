// 必须在所有其他模块引入之前加载环境变量
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') })

const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

// CORS 配置：优先从环境变量读取允许的来源，开发环境允许所有
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(s => s.trim())
  : null

app.use(cors({
  origin: allowedOrigins
    ? (origin, cb) => {
        if (!origin || allowedOrigins.includes(origin)) cb(null, true)
        else cb(new Error('Not allowed by CORS'))
      }
    : true, // 未配置时开发模式允许所有
  credentials: true
}))

app.use(express.json({ limit: '1mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/dishes', require('./routes/dishes'))
app.use('/api/mealplans', require('./routes/mealplans'))
app.use('/api/users', require('./routes/users'))
app.use('/api/bilibili', require('./routes/bilibili'))
app.use('/api/dish-requests', require('./routes/dishRequests'))
app.use('/api/ingredients', require('./routes/ingredients'))
app.use('/api/ratings', require('./routes/ratings'))
app.use('/api/stats', require('./routes/stats'))
app.use('/api/dish-bindings', require('./routes/dishBindings'))

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
