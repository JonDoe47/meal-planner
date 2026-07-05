const router = require('express').Router()
const { authMiddleware, adminMiddleware } = require('../middleware/auth')
const prisma = require('../lib/prisma')

router.post('/', authMiddleware, async (req, res) => {
  const { dishName, description } = req.body
  if (!dishName?.trim()) return res.status(400).json({ message: 'Please enter a dish name' })

  try {
    const request = await prisma.dishRequest.create({
      data: { userId: req.user.id, dishName: dishName.trim(), description: description || null },
      include: { user: { select: { id: true, name: true } } }
    })
    res.json(request)
  } catch (e) {
    res.status(400).json({ message: 'Submit failed: ' + e.message })
  }
})

router.get('/', authMiddleware, async (req, res) => {
  const where = req.user.role === 'ADMIN' ? {} : { userId: req.user.id }
  const requests = await prisma.dishRequest.findMany({
    where,
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'desc' }
  })

  if (req.user.role === 'ADMIN') {
    requests.sort((a, b) => {
      const aVipPending = a.status === 'PENDING' && a.user.role === 'VIP'
      const bVipPending = b.status === 'PENDING' && b.user.role === 'VIP'
      if (aVipPending && !bVipPending) return -1
      if (bVipPending && !aVipPending) return 1
      return new Date(b.createdAt) - new Date(a.createdAt)
    })
  }

  res.json(requests)
})

router.put('/:id', adminMiddleware, async (req, res) => {
  const { status, adminNote } = req.body
  if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ message: 'Invalid status' })

  try {
    const request = await prisma.dishRequest.update({
      where: { id: Number(req.params.id) },
      data: { status, adminNote: adminNote || null },
      include: { user: { select: { id: true, name: true } } }
    })
    res.json(request)
  } catch {
    res.status(400).json({ message: 'Operation failed' })
  }
})

router.delete('/:id', authMiddleware, async (req, res) => {
  const request = await prisma.dishRequest.findUnique({ where: { id: Number(req.params.id) } })
  if (!request) return res.status(404).json({ message: 'Request not found' })
  if (request.userId !== req.user.id && req.user.role !== 'ADMIN') {
    return res.status(403).json({ message: 'Forbidden' })
  }

  await prisma.dishRequest.delete({ where: { id: Number(req.params.id) } })
  res.json({ message: 'Deleted' })
})

module.exports = router
