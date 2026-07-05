const router = require('express').Router()
const { authMiddleware } = require('../middleware/auth')
const fs = require('fs')
const path = require('path')

const COVER_HOSTS = ['hdslb.com', 'bilibili.com']
const BILI_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  'Referer': 'https://www.bilibili.com'
}

function extractBvid(input) {
  const match = String(input || '').match(/BV[a-zA-Z0-9]+/)
  return match ? match[0] : null
}

function isAllowedCoverUrl(input) {
  try {
    const parsed = new URL(input)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
    return COVER_HOSTS.some(host => parsed.hostname === host || parsed.hostname.endsWith(`.${host}`))
  } catch {
    return false
  }
}

async function getBiliInfo(bvid) {
  const apiRes = await fetch(`https://api.bilibili.com/x/web-interface/view?bvid=${bvid}`, {
    headers: BILI_HEADERS
  })
  const data = await apiRes.json()
  if (data.code !== 0) {
    const err = new Error(data.message || 'Bilibili API error')
    err.status = 400
    throw err
  }
  return data.data
}

async function downloadCover(picUrl, bvid) {
  try {
    if (!isAllowedCoverUrl(picUrl)) return null
    const imgRes = await fetch(picUrl, { headers: BILI_HEADERS })
    const contentType = imgRes.headers.get('content-type') || ''
    if (!imgRes.ok || !contentType.startsWith('image/')) return null

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

function parseJsonObject(raw) {
  try {
    const jsonMatch = String(raw || '').match(/\{[\s\S]*\}/)
    return jsonMatch ? JSON.parse(jsonMatch[0]) : null
  } catch {
    return null
  }
}

router.get('/cover', authMiddleware, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ message: 'Please provide a Bilibili URL or BV id' })

  const bvid = extractBvid(url)
  if (!bvid) return res.status(400).json({ message: 'Invalid BV id' })

  try {
    const info = await getBiliInfo(bvid)
    const imageUrl = await downloadCover(info.pic, info.bvid)
    res.json({ bvid: info.bvid, imageUrl, title: info.title })
  } catch (e) {
    res.status(e.status || 500).json({ message: 'Failed to fetch cover: ' + e.message })
  }
})

router.post('/analyze', authMiddleware, async (req, res) => {
  const { url, categories } = req.body
  if (!url) return res.status(400).json({ message: 'Please provide a Bilibili URL or BV id' })

  const bvid = extractBvid(url)
  if (!bvid) return res.status(400).json({ message: 'Invalid BV id' })

  const bibiApiKey = process.env.BIBIGPT_API_KEY
  if (!bibiApiKey) {
    return res.status(503).json({ message: 'BIBIGPT_API_KEY is not configured' })
  }

  const videoUrl = `https://www.bilibili.com/video/${bvid}`
  const categoryHint = Array.isArray(categories) && categories.length > 0
    ? `并从这些分类中选择最匹配的一项作为 category，不匹配则返回空字符串：${categories.join('、')}`
    : 'category 可以返回空字符串'

  try {
    const [bibiRes, biliInfo] = await Promise.all([
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
            customPrompt: `这是一个烹饪视频。请提取菜品名称、食材、分类和分步做法，${categoryHint}。严格只返回 JSON，不要 markdown。格式：{"dishName":"红烧肉","category":"家常菜","ingredients":["五花肉","生姜"],"cookingSteps":["步骤1：处理食材","步骤2：下锅烹饪"]}。菜名只保留核心名称；食材只写名称不写用量并去重；做法 4-7 步，每步 50 字以内。`
          }
        }),
        signal: AbortSignal.timeout(120000)
      }),
      getBiliInfo(bvid).catch(() => null)
    ])

    if (!bibiRes.ok) {
      const errText = await bibiRes.text()
      return res.status(503).json({ message: `BiBiGPT request failed (${bibiRes.status}): ${errText}` })
    }

    const bibiData = await bibiRes.json()
    const rawSummary = bibiData.summary || ''
    const rawTitle = bibiData.detail?.title || biliInfo?.title || bvid
    const parsed = parseJsonObject(rawSummary) || {}
    const imageUrl = biliInfo?.pic ? await downloadCover(biliInfo.pic, bvid) : null

    res.json({
      dishName: typeof parsed.dishName === 'string' && parsed.dishName ? parsed.dishName : rawTitle,
      category: typeof parsed.category === 'string' ? parsed.category : '',
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      cookingSteps: Array.isArray(parsed.cookingSteps) ? parsed.cookingSteps : [],
      rawTitle,
      imageUrl
    })
  } catch (e) {
    if (e.name === 'TimeoutError') return res.status(503).json({ message: 'BiBiGPT request timed out' })
    res.status(500).json({ message: 'AI analyze failed: ' + e.message })
  }
})

router.get('/proxy-cover', authMiddleware, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).end()
  if (!isAllowedCoverUrl(url)) {
    return res.status(403).json({ message: 'Only Bilibili image hosts are allowed' })
  }

  try {
    const imgRes = await fetch(url, { headers: BILI_HEADERS })
    if (!imgRes.ok) return res.status(imgRes.status).end()

    const contentType = imgRes.headers.get('content-type') || 'image/jpeg'
    if (!contentType.startsWith('image/')) return res.status(415).end()

    const buffer = await imgRes.arrayBuffer()
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=86400')
    res.send(Buffer.from(buffer))
  } catch {
    res.status(500).end()
  }
})

router.get('/favorites', authMiddleware, async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ message: 'Please provide a favorites URL' })

  let mediaId = null
  const fidMatch = url.match(/[?&]fid=(\d+)/) || url.match(/favlist\/(\d+)/)
  const mlMatch = url.match(/\/ml(\d+)/)
  if (fidMatch) mediaId = fidMatch[1]
  else if (mlMatch) mediaId = mlMatch[1]
  else {
    const numMatch = url.match(/(\d{6,})/)
    if (numMatch) mediaId = numMatch[1]
  }

  if (!mediaId) return res.status(400).json({ message: 'Unable to identify favorites id' })

  try {
    const allVideos = []
    let page = 1
    let hasMore = true

    while (hasMore) {
      const apiRes = await fetch(
        `https://api.bilibili.com/x/v3/fav/resource/list?media_id=${mediaId}&pn=${page}&ps=40&type=0&platform=web`,
        { headers: BILI_HEADERS }
      )
      const data = await apiRes.json()
      if (data.code !== 0) return res.status(400).json({ message: 'Bilibili API error: ' + data.message })

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
    res.status(500).json({ message: 'Failed to fetch favorites: ' + e.message })
  }
})

router.post('/cooking-steps', authMiddleware, async (req, res) => {
  const { bvid } = req.body
  if (!bvid) return res.status(400).json({ message: 'Please provide a BV id' })

  const bibiApiKey = process.env.BIBIGPT_API_KEY
  if (!bibiApiKey) return res.status(503).json({ message: 'BIBIGPT_API_KEY is not configured' })

  const videoUrl = `https://www.bilibili.com/video/${bvid}`
  try {
    const bibiRes = await fetch('https://api.bibigpt.co/api/v1/summarizeWithConfig', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${bibiApiKey}` },
      body: JSON.stringify({
        url: videoUrl,
        promptConfig: {
          outputLanguage: 'zh',
          customPrompt: '这是一个烹饪视频。请根据视频内容提取分步做法，严格只返回 JSON，不要 markdown。格式：{"steps":["步骤1：具体操作","步骤2：具体操作"]}。要求：4-7 步，每步简洁实用，50 字以内。'
        }
      }),
      signal: AbortSignal.timeout(120000)
    })

    if (!bibiRes.ok) {
      const errText = await bibiRes.text()
      return res.status(503).json({ message: `BiBiGPT request failed (${bibiRes.status}): ${errText}` })
    }

    const bibiData = await bibiRes.json()
    const parsed = parseJsonObject(bibiData.summary) || {}
    const steps = Array.isArray(parsed.steps) ? parsed.steps : []
    if (steps.length === 0) return res.status(500).json({ message: 'AI did not return valid steps' })

    res.json({ steps })
  } catch (e) {
    if (e.name === 'TimeoutError') return res.status(503).json({ message: 'AI request timed out' })
    res.status(500).json({ message: 'AI generation failed: ' + e.message })
  }
})

module.exports = router
