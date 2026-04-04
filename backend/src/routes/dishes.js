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
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } })

router.get('/', authMiddleware, async (req, res) => {
  const { categoryId } = req.query
  const where = categoryId ? { categoryId: Number(categoryId) } : {}
  const dishes = await prisma.dish.findMany({ where, include: { category: true }, orderBy: { createdAt: 'desc' } })
  res.json(dishes)
})

router.get('/:id', authMiddleware, async (req, res) => {
  const dish = await prisma.dish.findUnique({ where: { id: Number(req.params.id) }, include: { category: true } })
  if (!dish) return res.status(404).json({ message: '菜品不存在' })
  res.json(dish)
})

router.post('/', adminMiddleware, upload.single('image'), async (req, res) => {
  const { name, categoryId, bvid, description, existingImageUrl, ingredients } = req.body
  const imageUrl = req.file ? `/uploads/${req.file.filename}` : (existingImageUrl || null)
  try {
    const dish = await prisma.dish.create({
      data: { name, categoryId: Number(categoryId), bvid: bvid || null, description: description || null, imageUrl, ingredients: ingredients || null },
      include: { category: true }
    })
    res.json(dish)
  } catch (e) {
    res.status(400).json({ message: '创建失败: ' + e.message })
  }
})

router.put('/:id', adminMiddleware, upload.single('image'), async (req, res) => {
  const { name, categoryId, bvid, description, existingImageUrl, ingredients } = req.body
  const data = { name, categoryId: Number(categoryId), bvid: bvid || null, description: description || null, ingredients: ingredients || null }
  if (req.file) data.imageUrl = `/uploads/${req.file.filename}`
  else if (existingImageUrl) data.imageUrl = existingImageUrl
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

module.exports = router
