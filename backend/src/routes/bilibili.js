const router = require('express').Router()
const { authMiddleware } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

function extractBvid(input) {
  const match = input.match(/BV[a-zA-Z0-9]+/)
  return match ? match[0] : null
}

router.get('/cover', authMiddleware, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ message: '请提供B站链接或BV号' })

  const bvid = extractBvid(url)
  if (!bvid) return res.status(400).json({ message: '无法识别BV号，请检查链接格式' })

  try {
    const apiRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    })
    const data = await apiRes.json()

    if (data.code !== 0) return res.status(400).json({ message: 'B站接口错误: ' + data.message })

    const picUrl = data.data.pic
    const title = data.data.title
    const realBvid = data.data.bvid

    // 下载封面图片到 uploads
    const imgRes = await fetch(picUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com'
      }
    })
    const buffer = await imgRes.arrayBuffer()
    const filename = `bili_${realBvid}_${Date.now()}.jpg`
    const uploadDir = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(buffer))

    res.json({ bvid: realBvid, imageUrl: `/uploads/${filename}`, title })
  } catch (e) {
    res.status(500).json({ message: '获取封面失败: ' + e.message })
  }
})

module.exports = router
