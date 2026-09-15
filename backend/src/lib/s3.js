/**
 * s3.js — S3 helpers for the ApkaAI Data Lake
 */
const { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3')
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const path = require('path')

const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' })

// MIME type map
const MIME = {
  csv: 'text/csv', tsv: 'text/tab-separated-values',
  json: 'application/json', ndjson: 'application/x-ndjson', jsonl: 'application/x-ndjson',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls:  'application/vnd.ms-excel',
  txt:  'text/plain', pdf: 'application/pdf',
  png:  'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  parquet: 'application/octet-stream',
}

function getMime(fileName) {
  const ext = path.extname(fileName).replace('.', '').toLowerCase()
  return MIME[ext] || 'application/octet-stream'
}

// Upload a buffer/string to S3
async function s3Upload(bucket, key, body, fileName = '') {
  const cmd = new PutObjectCommand({
    Bucket:      bucket,
    Key:         key,
    Body:        body,
    ContentType: getMime(fileName || key),
    Metadata:    { 'uploaded-by': 'apkaai-datalake', 'original-name': fileName || key },
  })
  return await s3.send(cmd)
}

// Get object as buffer
async function s3GetObject(bucket, key) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  const res = await s3.send(cmd)
  const chunks = []
  for await (const chunk of res.Body) chunks.push(chunk)
  return { buffer: Buffer.concat(chunks), contentType: res.ContentType, metadata: res.Metadata }
}

// List objects with optional prefix
async function s3List(bucket, prefix = '', maxKeys = 1000) {
  const cmd = new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: maxKeys })
  const res = await s3.send(cmd)
  return (res.Contents || []).map(o => ({
    key:          o.Key,
    size:         o.Size,
    lastModified: o.LastModified,
    sizeHuman:    o.Size > 1048576 ? `${(o.Size/1048576).toFixed(1)} MB` : o.Size > 1024 ? `${(o.Size/1024).toFixed(1)} KB` : `${o.Size} B`,
  }))
}

// Delete an object
async function s3Delete(bucket, key) {
  const cmd = new DeleteObjectCommand({ Bucket: bucket, Key: key })
  return await s3.send(cmd)
}

// Get pre-signed download URL (1 hour)
async function s3PresignedUrl(bucket, key, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: bucket, Key: key })
  return await getSignedUrl(s3, cmd, { expiresIn })
}

// Check bucket exists
async function s3BucketExists(bucket) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: '.keep' }))
    return true
  } catch (e) {
    return e.name !== 'NoSuchBucket'
  }
}

// Get folder summary from S3
async function s3FolderSummary(bucket) {
  const folders = ['raw/drive/', 'raw/uploads/', 'raw/unstructured/', 'processed/csv/', 'processed/parquet/', 'athena-results/']
  const summary = []
  for (const folder of folders) {
    try {
      const objects = await s3List(bucket, folder, 1000)
      const totalSize = objects.reduce((sum, o) => sum + o.size, 0)
      summary.push({
        folder,
        fileCount: objects.length,
        totalSize: totalSize > 1048576 ? `${(totalSize/1048576).toFixed(1)} MB` : totalSize > 1024 ? `${(totalSize/1024).toFixed(1)} KB` : `${totalSize} B`,
        latestFile: objects.sort((a,b) => new Date(b.lastModified) - new Date(a.lastModified))[0]?.key || null,
      })
    } catch { summary.push({ folder, fileCount: 0, totalSize: '0 B', latestFile: null }) }
  }
  return summary
}

module.exports = { s3Upload, s3GetObject, s3List, s3Delete, s3PresignedUrl, s3BucketExists, s3FolderSummary, getMime }
