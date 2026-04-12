const router = require('express').Router()
const { PrismaClient } = require('@prisma/client')
const { authMiddleware, adminMiddleware } = require('../middleware/auth')

const prisma = new PrismaClient()

// 获取某菜品的所有关联
router.get('/dish/:dishId', authMiddleware, async (req, res) => {
  const dishId = Number(req.params.dishId)
  const bindings = await prisma.dishBinding.findMany({
    where: { dishId },
    include: { boundDish: { include: { category: true } } },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }]
  })
  // 按 type 分组返回
  const grouped = {}
  bindings.forEach(b => {
    if (!grouped[b.type]) grouped[b.type] = []
    grouped[b.type].push({
      id: b.id,
      dishId: b.boundDishId,
      name: b.boundDish.name,
      categoryName: b.boundDish.category.name,
      imageUrl: b.boundDish.imageUrl,
      sort: b.sort
    })
  })
  res.json(grouped)
})

// 设置关联（覆盖式：先删后建）
router.post('/', adminMiddleware, async (req, res) => {
  const { dishId, bindings } = req.body
  if (!dishId) return res.status(400).json({ message: '缺少主菜 ID' })

  // 验证主菜存在
  const mainDish = await prisma.dish.findUnique({ where: { id: Number(dishId) } })
  if (!mainDish) return res.status(404).json({ message: '菜品不存在' })

  // 删除旧关联，批量创建新关联
  await prisma.dishBinding.deleteMany({ where: { dishId: Number(dishId) } })

  if (Array.isArray(bindings) && bindings.length > 0) {
    const results = []
    for (let i = 0; i < bindings.length; i++) {
      const b = bindings[i]
      if (!b.boundDishId || !b.type) continue

      // 防止自己关联自己
      if (Number(b.boundDishId) === Number(dishId)) continue

      try {
        const binding = await prisma.dishBinding.create({
          data: {
            dishId: Number(dishId),
            boundDishId: Number(b.boundDishId),
            type: String(b.type),
            sort: Number(b.sort || i)
          }
        })
        results.push(binding)
      } catch (e) {
        // 忽略重复等错误
        if (e.code !== 'P2002') {
          return res.status(400).json({ message: `保存失败: ${e.message}` })
        }
      }
    }
    res.json({ message: `已设置 ${results.length} 个关联`, count: results.length })
  } else {
    res.json({ message: '已清除所有关联', count: 0 })
  }
})

module.exports = router
