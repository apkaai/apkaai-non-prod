/**
 * ApkaAI Video Processor — AWS Lambda Function
 *
 * Trigger: S3 ObjectCreated events on ci-video-input bucket
 *          (prefix: uploads/ or zoom/ — configured in S3 event notification)
 *
 * Flow:
 *   1. Parse S3 event → get bucket + key
 *   2. Validate file type (MP4, MOV, MKV only)
 *   3. Extract videoId from key (path: {type}/{userId}/{videoId}/{filename})
 *   4. Check PostgreSQL — is this video already processing/done? (idempotency)
 *   5. Start MediaConvert job
 *   6. Update video record: status=processing, mediaconvert_job_id
 *   7. Log to CloudWatch (via console.log — Lambda auto-routes to CW)
 *
 * Environment variables (set in Lambda console or SAM/CDK):
 *   DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASS, DB_SSL
 *   MEDIACONVERT_ENDPOINT
 *   MEDIACONVERT_ROLE_ARN
 *   VIDEO_OUTPUT_BUCKET   (ci-video-new)
 *   AWS_REGION
 */

'use strict'

const { MediaConvertClient, CreateJobCommand } = require('@aws-sdk/client-mediaconvert')
const { S3Client, HeadObjectCommand }           = require('@aws-sdk/client-s3')
const { Client: PgClient }                      = require('pg')

// ── Config ────────────────────────────────────────────────────────────────────
const REGION         = process.env.AWS_REGION             || 'ap-south-1'
const MC_ENDPOINT    = process.env.MEDIACONVERT_ENDPOINT  || ''
const MC_ROLE_ARN    = process.env.MEDIACONVERT_ROLE_ARN  || ''
const OUTPUT_BUCKET  = process.env.VIDEO_OUTPUT_BUCKET    || 'ci-video-new'
const ALLOWED_EXTS   = new Set(['mp4', 'mov', 'avi', 'mkv', 'm4v', 'webm'])

const s3 = new S3Client({ region: REGION })

// ── DB connection (reuse across warm invocations) ─────────────────────────────
let pgClient = null

async function getDb() {
  if (pgClient) {
    try { await pgClient.query('SELECT 1'); return pgClient }
    catch { pgClient = null }
  }
  pgClient = new PgClient({
    host:     process.env.DB_HOST,
    port:     Number(process.env.DB_PORT)  || 5432,
    database: process.env.DB_NAME,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    ssl:      process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    connectionTimeoutMillis: 10000,
  })
  await pgClient.connect()
  return pgClient
}

// ── Resolution presets ────────────────────────────────────────────────────────
const RESOLUTIONS = [
  { name: '360p',  width: 640,  height: 360,  bitrate: 800000  },
  { name: '480p',  width: 854,  height: 480,  bitrate: 1500000 },
  { name: '720p',  width: 1280, height: 720,  bitrate: 4000000 },
  { name: '1080p', width: 1920, height: 1080, bitrate: 8000000 },
]

function buildOutputGroup(outputPrefix) {
  return {
    Name: 'ApkaAI_Outputs',
    OutputGroupSettings: {
      Type: 'FILE_GROUP_SETTINGS',
      FileGroupSettings: { Destination: `s3://${OUTPUT_BUCKET}/${outputPrefix}` },
    },
    Outputs: RESOLUTIONS.map(res => ({
      NameModifier: `_${res.name}`,
      ContainerSettings: {
        Container: 'MP4',
        Mp4Settings: { CslgAtom: 'INCLUDE', MoovPlacement: 'PROGRESSIVE_DOWNLOAD' },
      },
      VideoDescription: {
        Width: res.width, Height: res.height,
        ScalingBehavior: 'DEFAULT',
        CodecSettings: {
          Codec: 'H_264',
          H264Settings: {
            MaxBitrate:      res.bitrate,
            RateControlMode: 'QVBR',
            QvbrSettings:    { QvbrQualityLevel: 8 },
            CodecProfile:    'HIGH',
            CodecLevel:      'AUTO',
            GopSize:         90,
            NumberReferenceFrames: 3,
            FramerateControl: 'INITIALIZE_FROM_SOURCE',
            NumberBFramesBetweenReferenceFrames: 2,
            SceneChangeDetect: 'ENABLED',
            AdaptiveQuantization: 'HIGHER',
          },
        },
      },
      AudioDescriptions: [{
        CodecSettings: {
          Codec: 'AAC',
          AacSettings: {
            Bitrate: 128000,
            CodingMode: 'CODING_MODE_2_0',
            SampleRate: 48000,
            Specification: 'MPEG4',
          },
        },
      }],
    })),
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  console.log('[Lambda] Event received:', JSON.stringify(event, null, 2))

  for (const record of event.Records) {
    const bucket = record.s3.bucket.name
    const key    = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '))

    console.log(`[Lambda] Processing s3://${bucket}/${key}`)

    try {
      await processRecord(bucket, key)
    } catch (err) {
      // Log but don't throw — allows other records to process
      console.error(`[Lambda] Failed to process ${key}:`, err.message, err.stack)
    }
  }

  return { statusCode: 200, body: 'OK' }
}

async function processRecord(bucket, key) {
  // ── 1. Validate file extension ────────────────────────────────────────────
  const ext = key.split('.').pop()?.toLowerCase()
  if (!ALLOWED_EXTS.has(ext)) {
    console.log(`[Lambda] Skipping non-video file: ${key} (ext: ${ext})`)
    return
  }

  // ── 2. Extract videoId from key path ──────────────────────────────────────
  // Expected: uploads/{userId}/{videoId}/{filename} or zoom/{userId}/{videoId}/{filename}
  const parts = key.split('/')
  if (parts.length < 4) {
    console.warn(`[Lambda] Unexpected key structure: ${key}. Expected {type}/{userId}/{videoId}/{filename}`)
    return
  }
  const videoId     = parts[parts.length - 2]   // second-to-last segment
  const outputPrefix = `processed/${videoId}/`

  console.log(`[Lambda] VideoId: ${videoId}, OutputPrefix: ${outputPrefix}`)

  // ── 3. Idempotency check via PostgreSQL ───────────────────────────────────
  const db = await getDb()
  const check = await db.query(
    `SELECT status, mediaconvert_job_id FROM videos WHERE video_id = $1`,
    [videoId]
  )

  if (check.rows[0]) {
    const { status, mediaconvert_job_id } = check.rows[0]
    if (['processing', 'ready'].includes(status) && mediaconvert_job_id) {
      console.log(`[Lambda] Video ${videoId} already ${status} (job: ${mediaconvert_job_id}). Skipping.`)
      return
    }
  } else {
    console.warn(`[Lambda] Video record not found for ${videoId}. Creating minimal record.`)
    // Gracefully create a record if it doesn't exist (e.g. direct S3 upload bypassing API)
    await db.query(`
      INSERT INTO videos (video_id, user_id, title, source, source_ref, input_bucket, input_key, output_bucket, output_prefix, status)
      VALUES ($1, (SELECT user_id FROM users LIMIT 1), $2, 'upload', $3, $4, $5, $6, $7, 'uploading')
      ON CONFLICT (video_id) DO NOTHING
    `, [videoId, key.split('/').pop(), key, bucket, key, OUTPUT_BUCKET, outputPrefix])
  }

  // ── 4. Verify the object exists in S3 ────────────────────────────────────
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }))
    console.log(`[Lambda] Object confirmed: ${bucket}/${key}, size: ${head.ContentLength}`)
  } catch (err) {
    throw new Error(`S3 object not accessible: ${err.message}`)
  }

  // ── 5. Start MediaConvert job ─────────────────────────────────────────────
  if (!MC_ENDPOINT || !MC_ROLE_ARN) {
    throw new Error('MEDIACONVERT_ENDPOINT or MEDIACONVERT_ROLE_ARN not configured')
  }

  const mc = new MediaConvertClient({ region: REGION, endpoint: MC_ENDPOINT })
  const jobSettings = {
    Inputs: [{
      FileInput:       `s3://${bucket}/${key}`,
      AudioSelectors:  { 'Audio Selector 1': { DefaultSelection: 'DEFAULT' } },
      VideoSelector:   { ColorSpace: 'FOLLOW', Rotate: 'AUTO' },
      FilterEnable:    'AUTO',
      TimecodeSource:  'EMBEDDED',
    }],
    OutputGroups: [buildOutputGroup(outputPrefix)],
    TimecodeConfig: { Source: 'EMBEDDED' },
  }

  const createJobResp = await mc.send(new CreateJobCommand({
    Role:     MC_ROLE_ARN,
    Settings: jobSettings,
    UserMetadata: { videoId, inputKey: key, source: 'lambda-trigger' },
  }))

  const jobId = createJobResp.Job?.Id
  if (!jobId) throw new Error('MediaConvert did not return a job ID')

  console.log(`[Lambda] MediaConvert job ${jobId} started for video ${videoId}`)

  // ── 6. Update video record ────────────────────────────────────────────────
  await db.query(
    `UPDATE videos
     SET status = 'processing', mediaconvert_job_id = $1, updated_at = NOW()
     WHERE video_id = $2`,
    [jobId, videoId]
  )

  console.log(`[Lambda] Video ${videoId} status → processing, job: ${jobId}`)
}
