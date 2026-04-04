const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

router.get('/', authMiddleware, async (req, res) => {
  const categories = await prisma.category.findMany({ orderBy: { sort: 'asc' } })
  res.json(categories)
})

router.post('/', adminMiddleware, async (req, res) => {
  const { name, sort } = req.body
  try {
    const category = await prisma.category.create({ data: { name, sort: sort || 0 } })
    res.json(category)
  } catch (e) {
    res.status(400).json({ message: '分类名称已存在' })
  }
})

router.put('/:id', adminMiddleware, async (req, res) => {
  const { name, sort } = req.body
  try {
    const category = await prisma.category.update({ where: { id: Number(req.params.id) }, data: { name, sort } })
    res.json(category)
  } catch (e) {
    res.status(400).json({ message: '更新失败' })
  }
})

router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: Number(req.params.id) } })
    res.json({ message: '删除成功' })
  } catch (e) {
    res.status(400).json({ message: '该分类下有菜品，无法删除' })
  }
})

module.exports = router
