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

router.post('/analyze', authMiddleware, async (req, res) => {
  const { url } = req.body
  if (!url) return res.status(400).json({ message: '请提供B站链接或BV号' })
  const bvid = extractBvid(url)
  if (!bvid) return res.status(400).json({ message: '无法识别BV号，请检查链接格式' })
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(503).json({ message: 'AI识别功能未配置，请在服务器设置 ANTHROPIC_API_KEY' })
  }

  try {
    const apiRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': 'https://www.bilibili.com'
      }
    })
    const data = await apiRes.json()
    if (data.code !== 0) return res.status(400).json({ message: 'B站接口错误: ' + data.message })

    const title = data.data.title
    const desc = data.data.desc || ''

    const Anthropic = require('@anthropic-ai/sdk')
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: '你是专门分析烹饪视频信息的助手。根据B站视频标题和简介，提取菜品名称和食材列表。严格按JSON格式返回，不含任何额外文字或markdown代码块。',
      messages: [{
        role: 'user',
        content: `视频标题：${title}\n视频简介：${desc}\n\n请提取：\n1. 菜品名称（去掉"做法""教程""怎么做""家常""简单"等修饰词，保留核心菜名）\n2. 食材名称列表（仅名称不含用量，去重）\n\n返回格式（严格JSON，不含markdown）：\n{"dishName":"红烧肉","ingredients":["猪五花肉","生姜","大葱","料酒","生抽","老抽","冰糖"]}`
      }]
    })

    let parsed = { dishName: '', ingredients: [] }
    try {
      const raw = message.content[0].text.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '')
      parsed = JSON.parse(raw)
    } catch { parsed.dishName = title }

    if (typeof parsed.dishName !== 'string') parsed.dishName = title
    if (!Array.isArray(parsed.ingredients)) parsed.ingredients = []

    res.json({ dishName: parsed.dishName, ingredients: parsed.ingredients, rawTitle: title })
  } catch (e) {
    if (e.status === 401) return res.status(503).json({ message: 'AI识别失败：API Key无效，请检查配置' })
    res.status(500).json({ message: 'AI识别失败: ' + e.message })
  }
})

module.exports = router
