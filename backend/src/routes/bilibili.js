const router = require('express').Router()
const { authMiddleware } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

function extractBvid(input) {
  const match = input.match(/BV[a-zA-Z0-9]+/)
  return match ? match[0] : null
}

async function downloadCover(picUrl, bvid) {
  try {
    const imgRes = await fetch(picUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Referer': 'https://www.bilibili.com'
      }
    })
    const buffer = await imgRes.arrayBuffer()
    const filename = `bili_${bvid}_${Date.now()}.jpg`
    const uploadDir = path.join(__dirname, '../../uploads')
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true })
    fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(buffer))
    return `/uploads/${filename}`
  } catch {
    return null
  }
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
    const imageUrl = await downloadCover(picUrl, realBvid)

    res.json({ bvid: realBvid, imageUrl, title })
  } catch (e) {
    res.status(500).json({ message: '获取封面失败: ' + e.message })
  }
})

router.post('/analyze', authMiddleware, async (req, res) => {
  const { url, categories } = req.body
  if (!url) return res.status(400).json({ message: '请提供B站链接或BV号' })
  const bvid = extractBvid(url)
  if (!bvid) return res.status(400).json({ message: '无法识别BV号，请检查链接格式' })

  const bibiApiKey = process.env.BIBIGPT_API_KEY
  if (!bibiApiKey) {
    return res.status(503).json({ message: 'AI识别功能未配置，请在服务器设置 BIBIGPT_API_KEY' })
  }

  const videoUrl = `https://www.bilibili.com/video/${bvid}`
  const catHint = Array.isArray(categories) && categories.length > 0
    ? `，并从以下分类中选择最匹配的一个作为category字段（不匹配则返回空字符串）：${categories.join('、')}`
    : ''

  try {
    // AI分析和封面下载并行执行
    const [bibiRes, biliInfoRes] = await Promise.all([
      fetch('https://api.bibigpt.co/api/v1/summarizeWithConfig', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${bibiApiKey}`
        },
        body: JSON.stringify({
          url: videoUrl,
          promptConfig: {
            outputLanguage: 'zh',
            customPrompt: `这是一个烹饪视频。请提取菜品名称、所需食材${catHint}，严格按以下JSON格式返回，不含任何其他文字或markdown：{"dishName":"红烧肉","category":"家常菜","ingredients":["猪五花肉","生姜","大葱","料酒","生抽","老抽","冰糖"]}。菜品名称去掉"做法""教程""怎么做""家常""简单"等修饰词，只保留核心菜名；食材只写名称不写用量，去重。`
          }
        }),
        signal: AbortSignal.timeout(120000)
      }),
      fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://www.bilibili.com'
        }
      })
    ])

    if (!bibiRes.ok) {
      const errText = await bibiRes.text()
      return res.status(503).json({ message: `BiBiGPT 请求失败(${bibiRes.status}): ${errText}` })
    }

    const bibiData = await bibiRes.json()
    const rawSummary = bibiData.summary || ''
    const rawTitle = bibiData.detail?.title || bvid

    // 下载封面
    let imageUrl = null
    try {
      const biliInfo = await biliInfoRes.json()
      if (biliInfo.code === 0 && biliInfo.data?.pic) {
        imageUrl = await downloadCover(biliInfo.data.pic, bvid)
      }
    } catch { /* 封面获取失败不影响主流程 */ }

    let parsed = { dishName: '', category: '', ingredients: [] }
    try {
      const jsonMatch = rawSummary.match(/\{[\s\S]*?\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch { parsed.dishName = rawTitle }

    if (typeof parsed.dishName !== 'string' || !parsed.dishName) parsed.dishName = rawTitle
    if (!Array.isArray(parsed.ingredients)) parsed.ingredients = []
    if (typeof parsed.category !== 'string') parsed.category = ''

    res.json({ dishName: parsed.dishName, category: parsed.category, ingredients: parsed.ingredients, rawTitle, imageUrl })
  } catch (e) {
    if (e.name === 'TimeoutError') return res.status(503).json({ message: 'BiBiGPT 处理超时（视频较长时需要更多时间），请稍后重试' })
    res.status(500).json({ message: 'AI识别失败: ' + e.message })
  }
})

// 获取B站收藏夹视频列表
router.get('/favorites', authMiddleware, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ message: '请提供收藏夹链接' })

  // 提取 media_id，支持多种格式
  // https://space.bilibili.com/xxx/favlist?fid=123  -> 123
  // https://www.bilibili.com/medialist/play/ml123456 -> 123456
  let mediaId = null
  const fidMatch = url.match(/[?&]fid=(\d+)/) || url.match(/favlist\/(\d+)/)
  const mlMatch = url.match(/\/ml(\d+)/)
  if (fidMatch) mediaId = fidMatch[1]
  else if (mlMatch) mediaId = mlMatch[1]
  else {
    const numMatch = url.match(/(\d{6,})/)
    if (numMatch) mediaId = numMatch[1]
  }

  if (!mediaId) return res.status(400).json({ message: '无法识别收藏夹ID，请检查链接格式' })

  try {
    const allVideos = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const apiRes = await fetch(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${mediaId}&pn=${page}&ps=40&type=0&platform=web`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': 'https://www.bilibili.com'
          }
        }
      )
      const data = await apiRes.json()
      if (data.code !== 0) return res.status(400).json({ message: 'B站接口错误: ' + data.message })

      const medias = data.data?.medias || []
      medias.forEach(v => {
        if (v.bvid) {
          allVideos.push({
            bvid: v.bvid,
            title: v.title,
            cover: v.cover,
            url: `https://www.bilibili.com/video/${v.bvid}`
          })
        }
      })

      hasMore = !!data.data?.has_more
      page++
    }

    res.json({ total: allVideos.length, videos: allVideos })
  } catch (e) {
    res.status(500).json({ message: '获取收藏夹失败: ' + e.message })
  }
})

// AI生成分步做法
router.post('/cooking-steps', authMiddleware, async (req, res) => {
  const { bvid } = req.body
  if (!bvid) return res.status(400).json({ message: '请提供BV号' })

  const bibiApiKey = process.env.BIBIGPT_API_KEY
  if (!bibiApiKey) return res.status(503).json({ message: 'AI功能未配置，请设置 BIBIGPT_API_KEY' })

  const videoUrl = `https://www.bilibili.com/video/${bvid}`
  try {
    const bibiRes = await fetch('https://api.bibigpt.co/api/v1/summarizeWithConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bibiApiKey}` },
      body: JSON.stringify({
        url: videoUrl,
        promptConfig: {
          outputLanguage: 'zh',
          customPrompt: `这是一个烹饪视频。请根据视频内容提取分步骤做法，严格按以下JSON格式返回，不含任何其他文字或markdown：{"steps":["步骤1：具体操作","步骤2：具体操作"]}。要求：步骤数量4-7步，每步简洁实用，以"步骤N："开头，50字以内。`
        }
      }),
      signal: AbortSignal.timeout(120000)
    })

    if (!bibiRes.ok) {
      const errText = await bibiRes.text()
      return res.status(503).json({ message: `BiBiGPT 请求失败(${bibiRes.status}): ${errText}` })
    }

    const bibiData = await bibiRes.json()
    const rawSummary = bibiData.summary || ''

    let steps = []
    try {
      const jsonMatch = rawSummary.match(/\{[\s\S]*?\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        if (Array.isArray(parsed.steps)) steps = parsed.steps
      }
    } catch { /* ignore */ }

    if (steps.length === 0) return res.status(500).json({ message: 'AI未能生成有效步骤，请重试' })

    res.json({ steps })
  } catch (e) {
    if (e.name === 'TimeoutError') return res.status(503).json({ message: 'AI处理超时，请稍后重试' })
    res.status(500).json({ message: 'AI生成失败: ' + e.message })
  }
})

module.exports = router
