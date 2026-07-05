const router = require('express').Router()
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const prisma = require('../lib/prisma')
const multer = require('multer')
const path = require('path')
const fs = require('fs')
const crypto = require('crypto')

const uploadDir = path.join(__dirname, '../../uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
})

const allowedUploadTypes = {
  image: {
    mime: /^image\/(jpeg|png|webp|gif)$/,
    ext: new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
  },
  video: {
    mime: /^video\/(mp4|quicktime|webm|x-msvideo)$/,
    ext: new Set(['.mp4', '.mov', '.webm', '.avi'])
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 500 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const rule = allowedUploadTypes[file.fieldname]
    const ext = path.extname(file.originalname).toLowerCase()
    if (!rule || !rule.mime.test(file.mimetype) || !rule.ext.has(ext)) {
      return cb(new Error('Unsupported upload file type'))
    }
    cb(null, true)
  }
})
const uploadFields = upload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'video', maxCount: 1 }
])

function handleDishUpload(req, res, next) {
  uploadFields(req, res, err => {
    if (!err) return next()
    const message = err.code === 'LIMIT_FILE_SIZE'
      ? 'Uploaded file is too large'
      : err.message || 'Upload failed'
    res.status(400).json({ message })
  })
}

router.get('/', authMiddleware, async (req, res) => {
  const { categoryId } = req.query
  const where = categoryId ? { categoryId: Number(categoryId) } : {}
  const dishes = await prisma.dish.findMany({
    where,
    include: { category: true },
    orderBy: { createdAt: 'desc' }
  })
  const dishIds = dishes.map(d => d.id)
  const ratingGroups = dishIds.length
    ? await prisma.dishRating.groupBy({
        by: ['dishId'],
        where: { dishId: { in: dishIds } },
        _avg: { score: true },
        _count: { _all: true }
      })
    : []
  const ratingMap = new Map(ratingGroups.map(r => [
    r.dishId,
    {
      avgRating: r._avg.score == null ? null : Math.round(r._avg.score * 10) / 10,
      ratingCount: r._count._all
    }
  ]))
  const result = dishes.map(d => {
    const rating = ratingMap.get(d.id) || { avgRating: null, ratingCount: 0 }
    return { ...d, ...rating }
  })
  res.json(result)
})

router.get('/:id', authMiddleware, async (req, res) => {
  const dish = await prisma.dish.findUnique({ where: { id: Number(req.params.id) }, include: { category: true } })
  if (!dish) return res.status(404).json({ message: '菜品不存在' })
  res.json(dish)
})

router.post('/', adminMiddleware, handleDishUpload, async (req, res) => {
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

router.put('/:id', adminMiddleware, handleDishUpload, async (req, res) => {
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
