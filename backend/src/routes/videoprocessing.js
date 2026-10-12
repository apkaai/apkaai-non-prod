/**
 * videoprocessing.js — Video library, upload, playback, status
 *
 * Routes:
 *   GET  /api/videos                     → list user's videos
 *   GET  /api/videos/:id                 → video metadata + available resolutions
 *   POST /api/videos/upload-url          → presigned S3 upload URL
 *   POST /api/videos/confirm-upload      → notify backend upload is done → trigger processing
 *   POST /api/videos/import-zoom         → import from Zoom download URL → S3 → process
 *   GET  /api/videos/:id/playback/:res   → CloudFront signed playback URL
 *   POST /api/videos/:id/retry           → retry a failed processing job
 *   DELETE /api/videos/:id               → delete video record + S3 objects
 *   GET  /api/videos/:id/status          → polling endpoint for status
 */
const express  = require('express')
const router   = express.Router()
const crypto   = require('crypto')
const https    = require('https')
const { v4: uuidv4 } = require('uuid')
const { query: dbQuery }  = require('../lib/db')
const { s3Upload, s3PresignedUrl, s3Delete, s3List } = require('../lib/s3')
const { startMediaConvertJob } = require('../lib/mediaconvert')

// ── SDK for presigned PUT ─────────────────────────────────────────────────────
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' })

// ── Config ────────────────────────────────────────────────────────────────────
const INPUT_BUCKET     = process.env.VIDEO_INPUT_BUCKET  || 'ci-video-input'
const OUTPUT_BUCKET    = process.env.VIDEO_OUTPUT_BUCKET || 'ci-video-new'
const CLOUDFRONT_URL   = (process.env.VIDEO_CLOUDFRONT_URL || '').replace(/\/$/, '')

// ── Auth helpers (same HMAC JWT pattern as rest of codebase) ──────────────────
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'Not authenticated' })
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function ensureVideosTable() {
  await dbQuery(`
    CREATE TABLE IF NOT EXISTS videos (
      video_id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id           UUID         NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
      title             VARCHAR(500) NOT NULL,
      source            VARCHAR(50)  DEFAULT 'upload'  CHECK (source IN ('upload','zoom')),
      source_ref        VARCHAR(500),                  -- zoom meeting/file id or original filename
      input_bucket      VARCHAR(200),
      input_key         VARCHAR(1000),
      output_bucket     VARCHAR(200),
      output_prefix     VARCHAR(1000),
      status            VARCHAR(50)  DEFAULT 'uploading'
                          CHECK (status IN ('uploading','processing','ready','failed')),
      mediaconvert_job_id VARCHAR(500),
      available_resolutions TEXT[]   DEFAULT '{}',
      manifest_key      VARCHAR(1000),
      file_size         BIGINT       DEFAULT 0,
      duration_seconds  INTEGER,
      error_message     TEXT,
      thumbnail_key     VARCHAR(1000),
      created_at        TIMESTAMPTZ  DEFAULT NOW(),
      updated_at        TIMESTAMPTZ  DEFAULT NOW()
    )
  `)
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)`)
  await dbQuery(`CREATE INDEX IF NOT EXISTS idx_videos_status  ON videos(status)`)
}

// ── GET /api/videos ───────────────────────────────────────────────────────────
router.get('/', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const { page = 1, limit = 20, status } = req.query
    const offset = (Number(page) - 1) * Number(limit)
    let whereClause = 'WHERE user_id = $1'
    const params = [req.user.userId]
    if (status) { whereClause += ` AND status = $${params.push(status)}`; }

    const [rows, countRow] = await Promise.all([
      dbQuery(`SELECT * FROM videos ${whereClause} ORDER BY created_at DESC LIMIT $${params.push(Number(limit))} OFFSET $${params.push(offset)}`, params),
      dbQuery(`SELECT COUNT(*) FROM videos WHERE user_id = $1 ${status ? 'AND status = $2' : ''}`, status ? [req.user.userId, status] : [req.user.userId]),
    ])

    res.json({
      videos:     rows.rows,
      total:      Number(countRow.rows[0].count),
      page:       Number(page),
      totalPages: Math.ceil(Number(countRow.rows[0].count) / Number(limit)),
    })
  } catch (err) { next(err) }
})

// ── GET /api/videos/:id ───────────────────────────────────────────────────────
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const r = await dbQuery(
      'SELECT * FROM videos WHERE video_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })

    // Attach manifest data if available
    let manifest = null
    if (r.rows[0].manifest_key) {
      try {
        const { s3GetObject } = require('../lib/s3')
        const obj = await s3GetObject(OUTPUT_BUCKET, r.rows[0].manifest_key)
        manifest = JSON.parse(obj.buffer.toString())
      } catch { /* manifest not ready yet */ }
    }

    res.json({ video: r.rows[0], manifest })
  } catch (err) { next(err) }
})

// ── GET /api/videos/:id/status ────────────────────────────────────────────────
router.get('/:id/status', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const r = await dbQuery(
      'SELECT video_id, status, available_resolutions, error_message, updated_at FROM videos WHERE video_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })
    res.json(r.rows[0])
  } catch (err) { next(err) }
})

// ── POST /api/videos/upload-url ───────────────────────────────────────────────
// Returns a presigned S3 PUT URL + a videoId to track the upload
router.post('/upload-url', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const { filename, contentType = 'video/mp4', fileSize } = req.body
    if (!filename) return res.status(400).json({ error: 'filename is required' })

    // Validate file type
    const ext = filename.split('.').pop()?.toLowerCase()
    const allowed = ['mp4', 'mov', 'avi', 'mkv', 'm4v']
    if (!allowed.includes(ext)) {
      return res.status(400).json({ error: `Unsupported format. Allowed: ${allowed.join(', ')}` })
    }

    // Create video record
    const videoId  = uuidv4()
    const inputKey = `uploads/${req.user.userId}/${videoId}/${filename}`

    await dbQuery(
      `INSERT INTO videos (video_id, user_id, title, source, source_ref, input_bucket, input_key, output_bucket, output_prefix, status, file_size)
       VALUES ($1,$2,$3,'upload',$4,$5,$6,$7,$8,'uploading',$9)`,
      [videoId, req.user.userId, filename.replace(/\.[^.]+$/, ''), filename, INPUT_BUCKET, inputKey, OUTPUT_BUCKET, `processed/${videoId}/`, fileSize || 0]
    )

    // Generate presigned PUT URL (15 minutes)
    const cmd = new PutObjectCommand({
      Bucket:        INPUT_BUCKET,
      Key:           inputKey,
      ContentType:   contentType,
      Metadata:      { 'video-id': videoId, 'user-id': req.user.userId },
    })
    const uploadUrl = await getSignedUrl(s3, cmd, { expiresIn: 900 })

    res.json({ videoId, uploadUrl, inputKey, expiresIn: 900 })
  } catch (err) { next(err) }
})

// ── POST /api/videos/confirm-upload ──────────────────────────────────────────
// Called by frontend after S3 upload completes → triggers MediaConvert
router.post('/confirm-upload', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const { videoId } = req.body
    if (!videoId) return res.status(400).json({ error: 'videoId is required' })

    const r = await dbQuery(
      'SELECT * FROM videos WHERE video_id = $1 AND user_id = $2',
      [videoId, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })
    if (r.rows[0].status !== 'uploading') {
      return res.status(400).json({ error: `Video is already in ${r.rows[0].status} state` })
    }

    // Start MediaConvert job
    await dbQuery(
      `UPDATE videos SET status='processing', updated_at=NOW() WHERE video_id=$1`,
      [videoId]
    )

    // Fire-and-forget MediaConvert (errors are caught and stored)
    startMediaConvertJob({
      videoId,
      inputBucket:  r.rows[0].input_bucket,
      inputKey:     r.rows[0].input_key,
      outputBucket: r.rows[0].output_bucket,
      outputPrefix: r.rows[0].output_prefix,
    }).then(async jobId => {
      await dbQuery(
        `UPDATE videos SET mediaconvert_job_id=$1, updated_at=NOW() WHERE video_id=$2`,
        [jobId, videoId]
      )
    }).catch(async err => {
      await dbQuery(
        `UPDATE videos SET status='failed', error_message=$1, updated_at=NOW() WHERE video_id=$2`,
        [err.message, videoId]
      )
    })

    res.json({ success: true, videoId, status: 'processing' })
  } catch (err) { next(err) }
})

// ── POST /api/videos/import-zoom ─────────────────────────────────────────────
// Import a Zoom recording: download → upload to ci-video-input → trigger processing
router.post('/import-zoom', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const { downloadUrl, title, zoomToken, meetingId, fileId, fileSize } = req.body
    if (!downloadUrl) return res.status(400).json({ error: 'downloadUrl is required' })

    const videoId  = uuidv4()
    const filename = `zoom-${meetingId || videoId}.mp4`
    const inputKey = `zoom/${req.user.userId}/${videoId}/${filename}`

    // Create record immediately so frontend can track
    await dbQuery(
      `INSERT INTO videos (video_id, user_id, title, source, source_ref, input_bucket, input_key, output_bucket, output_prefix, status, file_size)
       VALUES ($1,$2,$3,'zoom',$4,$5,$6,$7,$8,'uploading',$9)`,
      [videoId, req.user.userId, title || filename, `${meetingId}/${fileId}`, INPUT_BUCKET, inputKey, OUTPUT_BUCKET, `processed/${videoId}/`, fileSize || 0]
    )

    // Stream download from Zoom → S3 (async, no await — let it run in background)
    ;(async () => {
      try {
        // Download from Zoom with token
        const downloadResp = await new Promise((resolve, reject) => {
          const url = new URL(downloadUrl)
          const options = {
            hostname: url.hostname,
            path: `${url.pathname}${url.search}`,
            headers: {
              Authorization: `Bearer ${zoomToken}`,
              'User-Agent': 'ApkaAI/1.0',
            },
          }
          https.get(options, res => {
            // Handle redirects
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
              https.get(res.headers.location, resolve).on('error', reject)
            } else {
              resolve(res)
            }
          }).on('error', reject)
        })

        // Collect buffer
        const chunks = []
        for await (const chunk of downloadResp) chunks.push(chunk)
        const buffer = Buffer.concat(chunks)

        // Upload to S3
        await s3Upload(INPUT_BUCKET, inputKey, buffer, filename)

        // Update file size
        await dbQuery(
          `UPDATE videos SET file_size=$1, updated_at=NOW() WHERE video_id=$2`,
          [buffer.length, videoId]
        )

        // Trigger MediaConvert
        await dbQuery(`UPDATE videos SET status='processing', updated_at=NOW() WHERE video_id=$1`, [videoId])
        const jobId = await startMediaConvertJob({
          videoId, inputBucket: INPUT_BUCKET, inputKey, outputBucket: OUTPUT_BUCKET, outputPrefix: `processed/${videoId}/`,
        })
        await dbQuery(`UPDATE videos SET mediaconvert_job_id=$1, updated_at=NOW() WHERE video_id=$2`, [jobId, videoId])
      } catch (err) {
        console.error(`[VideoImport] Failed for ${videoId}:`, err.message)
        await dbQuery(
          `UPDATE videos SET status='failed', error_message=$1, updated_at=NOW() WHERE video_id=$2`,
          [err.message, videoId]
        )
      }
    })()

    // Respond immediately with videoId
    res.json({ success: true, videoId, status: 'uploading', message: 'Import started. Check status for progress.' })
  } catch (err) { next(err) }
})

// ── GET /api/videos/:id/playback/:resolution ──────────────────────────────────
router.get('/:id/playback/:resolution', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const { id, resolution } = req.params
    const allowed = ['360p', '480p', '720p', '1080p']
    if (!allowed.includes(resolution)) {
      return res.status(400).json({ error: `Invalid resolution. Allowed: ${allowed.join(', ')}` })
    }

    const r = await dbQuery(
      'SELECT * FROM videos WHERE video_id = $1 AND user_id = $2',
      [id, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })
    const video = r.rows[0]

    if (video.status !== 'ready') {
      return res.status(400).json({ error: `Video is not ready. Current status: ${video.status}` })
    }

    const resolutions = video.available_resolutions || []
    if (!resolutions.includes(resolution)) {
      return res.status(400).json({
        error: `Resolution ${resolution} not available. Available: ${resolutions.join(', ')}`,
        availableResolutions: resolutions,
      })
    }

    // Key convention: processed/{videoId}/{resolution}/{videoId}_{resolution}.mp4
    const videoKey = `${video.output_prefix}${resolution}/${id}_${resolution}.mp4`

    if (CLOUDFRONT_URL) {
      // Use CloudFront URL (signed if CLOUDFRONT_KEY_PAIR_ID configured)
      const cfKeyPairId = process.env.CLOUDFRONT_KEY_PAIR_ID
      const cfPrivateKey = process.env.CLOUDFRONT_PRIVATE_KEY

      if (cfKeyPairId && cfPrivateKey) {
        // Signed CloudFront URL (expires in 6 hours)
        const expires    = Math.floor(Date.now() / 1000) + 6 * 3600
        const cfUrl      = `${CLOUDFRONT_URL}/${videoKey}`
        const policy     = JSON.stringify({ Statement: [{ Resource: cfUrl, Condition: { DateLessThan: { 'AWS:EpochTime': expires } } }] })
        const policyB64  = Buffer.from(policy).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~')
        const sign       = crypto.createSign('RSA-SHA1')
        sign.update(policy)
        const sigB64     = sign.sign(cfPrivateKey, 'base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '~')
        const signedUrl  = `${cfUrl}?Expires=${expires}&Signature=${sigB64}&Key-Pair-Id=${cfKeyPairId}`
        return res.json({ url: signedUrl, expires, resolution })
      }

      // Unsigned CloudFront (for public distributions or OAC without signed URLs)
      return res.json({ url: `${CLOUDFRONT_URL}/${videoKey}`, resolution })
    }

    // Fallback: S3 presigned URL (1 hour)
    const url = await s3PresignedUrl(OUTPUT_BUCKET, videoKey, 3600)
    res.json({ url, expires: 3600, resolution })
  } catch (err) { next(err) }
})

// ── POST /api/videos/:id/retry ────────────────────────────────────────────────
router.post('/:id/retry', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const r = await dbQuery(
      'SELECT * FROM videos WHERE video_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })
    const video = r.rows[0]

    if (video.status !== 'failed') {
      return res.status(400).json({ error: `Can only retry failed videos. Current status: ${video.status}` })
    }

    await dbQuery(
      `UPDATE videos SET status='processing', error_message=NULL, mediaconvert_job_id=NULL, updated_at=NOW() WHERE video_id=$1`,
      [video.video_id]
    )

    startMediaConvertJob({
      videoId:      video.video_id,
      inputBucket:  video.input_bucket,
      inputKey:     video.input_key,
      outputBucket: video.output_bucket,
      outputPrefix: video.output_prefix,
    }).then(async jobId => {
      await dbQuery(`UPDATE videos SET mediaconvert_job_id=$1, updated_at=NOW() WHERE video_id=$2`, [jobId, video.video_id])
    }).catch(async err => {
      await dbQuery(`UPDATE videos SET status='failed', error_message=$1, updated_at=NOW() WHERE video_id=$2`, [err.message, video.video_id])
    })

    res.json({ success: true, videoId: video.video_id, status: 'processing' })
  } catch (err) { next(err) }
})

// ── DELETE /api/videos/:id ────────────────────────────────────────────────────
router.delete('/:id', requireAuth, async (req, res, next) => {
  try {
    await ensureVideosTable()
    const r = await dbQuery(
      'SELECT * FROM videos WHERE video_id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    )
    if (!r.rows[0]) return res.status(404).json({ error: 'Video not found' })
    const video = r.rows[0]

    // Delete S3 objects (best effort)
    try {
      // Delete input
      if (video.input_key) {
        await s3.send(new DeleteObjectCommand({ Bucket: video.input_bucket, Key: video.input_key }))
      }
      // Delete output prefix
      if (video.output_prefix) {
        const objects = await s3List(video.output_bucket, video.output_prefix, 1000)
        for (const obj of objects) {
          await s3.send(new DeleteObjectCommand({ Bucket: video.output_bucket, Key: obj.key }))
        }
      }
    } catch (s3Err) {
      console.warn(`[VideoDelete] S3 cleanup partial for ${video.video_id}:`, s3Err.message)
    }

    await dbQuery('DELETE FROM videos WHERE video_id = $1', [video.video_id])
    res.json({ success: true, message: 'Video deleted' })
  } catch (err) { next(err) }
})

module.exports = router
