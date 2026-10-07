/**
 * aws-pricing.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Live AWS Price List Query API wrapper with 24-hour PostgreSQL cache.
 *
 * Uses @aws-sdk/client-pricing — works automatically via IAM role on EC2
 * (no ACCESS_KEY / SECRET_KEY needed in .env when running on EC2).
 *
 * Supported service codes:
 *   AmazonEC2   — EC2 compute instances
 *   AmazonRDS   — RDS database instances
 *   AmazonS3    — S3 object storage
 *
 * AWS Pricing API is only available in us-east-1 (global endpoint).
 * We still filter by the target region in the query filters.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { PricingClient, GetProductsCommand } = require('@aws-sdk/client-pricing')
const { query } = require('./db')

// AWS Pricing API is only in us-east-1
const pricingClient = new PricingClient({
  region: 'us-east-1',
  // On EC2 the IAM role handles credentials automatically.
  // For local dev, set AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY in .env
})

// ─── Region name mapping ──────────────────────────────────────────────────────
// AWS Pricing API uses human-readable location names, not region codes
const REGION_NAMES = {
  'ap-south-1':     'Asia Pacific (Mumbai)',
  'ap-southeast-1': 'Asia Pacific (Singapore)',
  'ap-northeast-1': 'Asia Pacific (Tokyo)',
  'us-east-1':      'US East (N. Virginia)',
  'us-west-2':      'US West (Oregon)',
  'eu-west-1':      'Europe (Ireland)',
  'eu-central-1':   'Europe (Frankfurt)',
  'ap-south-2':     'Asia Pacific (Hyderabad)',
}

// ─── EC2 instance type → vCPU / RAM lookup ───────────────────────────────────
const EC2_SPECS = {
  't3.micro':   { vcpu: 2,  ram: 1 },
  't3.small':   { vcpu: 2,  ram: 2 },
  't3.medium':  { vcpu: 2,  ram: 4 },
  't3.large':   { vcpu: 2,  ram: 8 },
  't3.xlarge':  { vcpu: 4,  ram: 16 },
  't3.2xlarge': { vcpu: 8,  ram: 32 },
  'm5.large':   { vcpu: 2,  ram: 8 },
  'm5.xlarge':  { vcpu: 4,  ram: 16 },
  'm5.2xlarge': { vcpu: 8,  ram: 32 },
  'm5.4xlarge': { vcpu: 16, ram: 64 },
  'c5.large':   { vcpu: 2,  ram: 4 },
  'c5.xlarge':  { vcpu: 4,  ram: 8 },
  'c5.2xlarge': { vcpu: 8,  ram: 16 },
  'r5.large':   { vcpu: 2,  ram: 16 },
  'r5.xlarge':  { vcpu: 4,  ram: 32 },
  'r5.2xlarge': { vcpu: 8,  ram: 64 },
}

// ─── Cache helpers ────────────────────────────────────────────────────────────
async function getCached(cacheKey) {
  try {
    const result = await query(
      `SELECT price_usd, unit, description, raw_json, fetched_at
       FROM aws_price_cache
       WHERE cache_key = $1 AND expires_at > NOW()`,
      [cacheKey]
    )
    if (result.rowCount > 0) {
      return result.rows[0]
    }
    return null
  } catch (err) {
    console.warn('[AWS Pricing] Cache read error:', err.message)
    return null
  }
}

async function setCache(cacheKey, serviceCode, region, priceUsd, unit, description, rawJson) {
  try {
    await query(
      `INSERT INTO aws_price_cache
         (cache_key, service_code, region, price_usd, unit, description, raw_json, fetched_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW() + INTERVAL '24 hours')
       ON CONFLICT (cache_key) DO UPDATE
         SET price_usd  = $4,
             unit       = $5,
             description = $6,
             raw_json   = $7,
             fetched_at = NOW(),
             expires_at = NOW() + INTERVAL '24 hours'`,
      [cacheKey, serviceCode, region, priceUsd, unit, description, JSON.stringify(rawJson)]
    )
  } catch (err) {
    console.warn('[AWS Pricing] Cache write error:', err.message)
  }
}

// ─── Extract on-demand price from AWS response ────────────────────────────────
function extractOnDemandPrice(priceItem) {
  try {
    const parsed   = typeof priceItem === 'string' ? JSON.parse(priceItem) : priceItem
    const terms    = parsed.terms?.OnDemand
    if (!terms) return null

    const offerKey = Object.keys(terms)[0]
    const offer    = terms[offerKey]
    const pdKey    = Object.keys(offer.priceDimensions)[0]
    const pd       = offer.priceDimensions[pdKey]
    const price    = parseFloat(pd.pricePerUnit?.USD || '0')
    const unit     = pd.unit || 'Hrs'
    const desc     = pd.description || ''

    return { price, unit, desc }
  } catch {
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getEC2Price
// Fetch on-demand hourly price for an EC2 instance type in a region.
// Returns { hourly, monthly, vcpu, ram, instanceType, region, source, cachedAt }
// ─────────────────────────────────────────────────────────────────────────────
async function getEC2Price(instanceType = 't3.medium', region = 'ap-south-1') {
  const cacheKey    = `ec2:${instanceType}:${region}:linux`
  const locationName = REGION_NAMES[region] || region
  const specs       = EC2_SPECS[instanceType] || { vcpu: 0, ram: 0 }

  // ── Check cache ────────────────────────────────────────────────────────────
  const cached = await getCached(cacheKey)
  if (cached) {
    return {
      instanceType,
      region,
      vcpu:        specs.vcpu,
      ram:         specs.ram,
      hourly:      parseFloat(cached.price_usd),
      monthly:     parseFloat(cached.price_usd) * 730,
      annual:      parseFloat(cached.price_usd) * 730 * 12,
      unit:        cached.unit,
      description: cached.description,
      source:      'aws-live-cached',
      cachedAt:    cached.fetched_at,
    }
  }

  // ── Fetch from AWS Pricing API ─────────────────────────────────────────────
  console.log(`[AWS Pricing] Fetching EC2 ${instanceType} in ${region}...`)
  try {
    const cmd = new GetProductsCommand({
      ServiceCode: 'AmazonEC2',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType',     Value: instanceType },
        { Type: 'TERM_MATCH', Field: 'location',         Value: locationName },
        { Type: 'TERM_MATCH', Field: 'operatingSystem',  Value: 'Linux' },
        { Type: 'TERM_MATCH', Field: 'tenancy',          Value: 'Shared' },
        { Type: 'TERM_MATCH', Field: 'capacitystatus',   Value: 'Used' },
        { Type: 'TERM_MATCH', Field: 'preInstalledSw',   Value: 'NA' },
      ],
      MaxResults: 5,
    })

    const response = await pricingClient.send(cmd)
    if (!response.PriceList || response.PriceList.length === 0) {
      throw new Error(`No pricing found for EC2 ${instanceType} in ${region}`)
    }

    const extracted = extractOnDemandPrice(response.PriceList[0])
    if (!extracted || extracted.price === 0) {
      throw new Error('Could not extract on-demand price from AWS response')
    }

    // Cache it
    await setCache(
      cacheKey, 'AmazonEC2', region,
      extracted.price, extracted.unit, extracted.desc,
      JSON.parse(response.PriceList[0])
    )

    return {
      instanceType,
      region,
      vcpu:        specs.vcpu,
      ram:         specs.ram,
      hourly:      extracted.price,
      monthly:     extracted.price * 730,
      annual:      extracted.price * 730 * 12,
      unit:        extracted.unit,
      description: extracted.desc,
      source:      'aws-live-fresh',
      cachedAt:    new Date().toISOString(),
    }
  } catch (err) {
    console.error('[AWS Pricing] EC2 fetch error:', err.message)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getRDSPrice
// Fetch on-demand hourly price for an RDS instance in a region.
// ─────────────────────────────────────────────────────────────────────────────
async function getRDSPrice(instanceClass = 'db.t3.medium', engine = 'MySQL', region = 'ap-south-1') {
  const cacheKey     = `rds:${instanceClass}:${engine}:${region}`
  const locationName = REGION_NAMES[region] || region

  const cached = await getCached(cacheKey)
  if (cached) {
    return {
      instanceClass,
      engine,
      region,
      hourly:      parseFloat(cached.price_usd),
      monthly:     parseFloat(cached.price_usd) * 730,
      annual:      parseFloat(cached.price_usd) * 730 * 12,
      source:      'aws-live-cached',
      cachedAt:    cached.fetched_at,
    }
  }

  console.log(`[AWS Pricing] Fetching RDS ${instanceClass} ${engine} in ${region}...`)
  try {
    // Map engine to AWS database engine string
    const engineMap = {
      MySQL:      'MySQL',
      PostgreSQL: 'PostgreSQL',
      MariaDB:    'MariaDB',
      Aurora:     'Aurora MySQL',
    }
    const awsEngine = engineMap[engine] || 'MySQL'

    const cmd = new GetProductsCommand({
      ServiceCode: 'AmazonRDS',
      Filters: [
        { Type: 'TERM_MATCH', Field: 'instanceType',  Value: instanceClass },
        { Type: 'TERM_MATCH', Field: 'location',      Value: locationName },
        { Type: 'TERM_MATCH', Field: 'databaseEngine',Value: awsEngine },
        { Type: 'TERM_MATCH', Field: 'deploymentOption', Value: 'Single-AZ' },
      ],
      MaxResults: 5,
    })

    const response = await pricingClient.send(cmd)
    if (!response.PriceList || response.PriceList.length === 0) {
      throw new Error(`No RDS pricing found for ${instanceClass} ${engine} in ${region}`)
    }

    const extracted = extractOnDemandPrice(response.PriceList[0])
    if (!extracted || extracted.price === 0) {
      throw new Error('Could not extract RDS on-demand price')
    }

    await setCache(
      cacheKey, 'AmazonRDS', region,
      extracted.price, extracted.unit, extracted.desc,
      JSON.parse(response.PriceList[0])
    )

    return {
      instanceClass,
      engine,
      region,
      hourly:   extracted.price,
      monthly:  extracted.price * 730,
      annual:   extracted.price * 730 * 12,
      source:   'aws-live-fresh',
      cachedAt: new Date().toISOString(),
    }
  } catch (err) {
    console.error('[AWS Pricing] RDS fetch error:', err.message)
    throw err
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// getS3Price
// S3 storage is priced per GB-month — returns price for given storage amount.
// ─────────────────────────────────────────────────────────────────────────────
async function getS3Price(storageGB = 100, region = 'ap-south-1') {
  const cacheKey     = `s3:standard:${region}`
  const locationName = REGION_NAMES[region] || region

  let pricePerGB = null

  const cached = await getCached(cacheKey)
  if (cached) {
    pricePerGB = parseFloat(cached.price_usd)
  } else {
    console.log(`[AWS Pricing] Fetching S3 storage price in ${region}...`)
    try {
      const cmd = new GetProductsCommand({
        ServiceCode: 'AmazonS3',
        Filters: [
          { Type: 'TERM_MATCH', Field: 'location',     Value: locationName },
          { Type: 'TERM_MATCH', Field: 'storageClass', Value: 'General Purpose' },
          { Type: 'TERM_MATCH', Field: 'volumeType',   Value: 'Standard' },
        ],
        MaxResults: 5,
      })

      const response = await pricingClient.send(cmd)
      if (!response.PriceList || response.PriceList.length === 0) {
        throw new Error(`No S3 pricing found for ${region}`)
      }

      const extracted = extractOnDemandPrice(response.PriceList[0])
      if (!extracted || extracted.price === 0) throw new Error('Could not extract S3 price')

      await setCache(cacheKey, 'AmazonS3', region, extracted.price, 'GB-Mo', extracted.desc, JSON.parse(response.PriceList[0]))
      pricePerGB = extracted.price
    } catch (err) {
      console.error('[AWS Pricing] S3 fetch error:', err.message)
      throw err
    }
  }

  return {
    region,
    storageGB,
    pricePerGB,
    monthly:  pricePerGB * storageGB,
    annual:   pricePerGB * storageGB * 12,
    source:   cached ? 'aws-live-cached' : 'aws-live-fresh',
    cachedAt: cached ? cached.fetched_at : new Date().toISOString(),
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// clearExpiredCache
// Housekeeping — remove expired entries. Called automatically on each request.
// ─────────────────────────────────────────────────────────────────────────────
async function clearExpiredCache() {
  try {
    await query('DELETE FROM aws_price_cache WHERE expires_at < NOW()', [])
  } catch { /* non-fatal */ }
}

// ─────────────────────────────────────────────────────────────────────────────
// findClosestEC2Instance
// Given desired vCPU + RAM, finds the closest available instance type.
// ─────────────────────────────────────────────────────────────────────────────
function findClosestEC2Instance(targetVcpu, targetRam) {
  const candidates = Object.entries(EC2_SPECS).map(([type, specs]) => ({
    type,
    vcpu: specs.vcpu,
    ram:  specs.ram,
    score: Math.abs(specs.vcpu - targetVcpu) * 2 + Math.abs(specs.ram - targetRam),
  }))
  candidates.sort((a, b) => a.score - b.score)
  return candidates[0]
}

module.exports = {
  getEC2Price,
  getRDSPrice,
  getS3Price,
  clearExpiredCache,
  findClosestEC2Instance,
  EC2_SPECS,
  REGION_NAMES,
}
