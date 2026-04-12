const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const prisma = new PrismaClient()

const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.fieldname + path.extname(file.originalname))
})
const upload = multer({ storage, limits: { fileSize: 500 * 1024 * 1024 } })
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
])

router.get('/', authMiddleware, async (req, res) => {
  const { categoryId } = req.query
  const where = categoryId ? { categoryId: Number(categoryId) } : {}
  const dishes = await prisma.dish.findMany({
    where,
    include: { category: true, ratings: { select: { score: true } } },
    orderBy: { createdAt: 'desc' }
  })
  const result = dishes.map(d => {
    const avgRating = d.ratings.length
      ? Math.round((d.ratings.reduce((s, r) => s + r.score, 0) / d.ratings.length) * 10) / 10
      : null
    const { ratings, ...rest } = d
    return { ...rest, avgRating, ratingCount: ratings.length }
  })
  res.json(result)
})

router.get('/:id', authMiddleware, async (req, res) => {
  const dish = await prisma.dish.findUnique({ where: { id: Number(req.params.id) }, include: { category: true } })
  if (!dish) return res.status(404).json({ message: '菜品不存在' })
  res.json(dish)
})

router.post('/', adminMiddleware, uploadFields, async (req, res) => {
  const { name, categoryId, bvid, description, existingImageUrl, existingVideoUrl, ingredients, cookingSteps } = req.body
  const imageUrl = req.files?.['image']?.[0] ? `/uploads/${req.files['image'][0].filename}` : (existingImageUrl || null)
  const videoUrl = req.files?.['video']?.[0] ? `/uploads/${req.files['video'][0].filename}` : (existingVideoUrl || null)
  try {
    const dish = await prisma.dish.create({
      data: { name, categoryId: Number(categoryId), bvid: bvid || null, description: description || null, imageUrl, videoUrl, ingredients: ingredients || null, cookingSteps: cookingSteps || null },
      include: { category: true }
    })
    res.json(dish)
  } catch (e) {
    res.status(400).json({ message: '创建失败: ' + e.message })
  }
})

router.put('/:id', adminMiddleware, uploadFields, async (req, res) => {
  const { name, categoryId, bvid, description, existingImageUrl, existingVideoUrl, ingredients, cookingSteps } = req.body
  const data = { name, categoryId: Number(categoryId), bvid: bvid || null, description: description || null, ingredients: ingredients || null, cookingSteps: cookingSteps || null }
  if (req.files?.['image']?.[0]) data.imageUrl = `/uploads/${req.files['image'][0].filename}`
  else if (existingImageUrl) data.imageUrl = existingImageUrl
  if (req.files?.['video']?.[0]) data.videoUrl = `/uploads/${req.files['video'][0].filename}`
  else if (existingVideoUrl) data.videoUrl = existingVideoUrl
  else data.videoUrl = null
  try {
    const dish = await prisma.dish.update({ where: { id: Number(req.params.id) }, data, include: { category: true } })
    res.json(dish)
  } catch (e) {
    res.status(400).json({ message: '更新失败' })
  }
})

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await prisma.dish.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: '删除成功' })
  } catch (e) {
    res.status(400).json({ message: '删除失败' })
  }
})

// 批量创建菜品
router.post('/batch', adminMiddleware, async (req, res) => {
  const { dishes } = req.body
  if (!Array.isArray(dishes) || dishes.length === 0) {
    return res.status(400).json({ message: '请提供菜品列表' })
  }
  const results = []
  for (const d of dishes) {
    try {
      const dish = await prisma.dish.create({
        data: {
          name: d.name,
          categoryId: Number(d.categoryId),
          bvid: d.bvid || null,
          imageUrl: d.imageUrl || null,
          ingredients: d.ingredients ? JSON.stringify(d.ingredients) : null,
          description: d.description || null,
          cookingSteps: d.cookingSteps ? JSON.stringify(d.cookingSteps) : null
        },
        include: { category: true }
      })
      results.push({ success: true, dish })
    } catch (e) {
      results.push({ success: false, name: d.name, error: e.message })
    }
  }
  const successCount = results.filter(r => r.success).length
  res.json({ successCount, failCount: results.length - successCount, results })
})

module.exports = router
