const express = require('express')
const cors = require('cors')
const path = require('path')

const app = express()

app.use(cors())
app.use(express.json())
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

app.use('/api/auth', require('./routes/auth'))
app.use('/api/categories', require('./routes/categories'))
app.use('/api/dishes', require('./routes/dishes'))
app.use('/api/mealplans', require('./routes/mealplans'))
app.use('/api/users', require('./routes/users'))
app.use('/api/bilibili', require('./routes/bilibili'))
app.use('/api/dish-requests', require('./routes/dishRequests'))
app.use('/api/ingredients', require('./routes/ingredients'))

// 托管前端静态文件
app.use(express.static(path.join(__dirname, '../public')))
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'))
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
