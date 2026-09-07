const express = require('express')
const router  = express.Router()
const { DynamoDBDocumentClient, PutCommand, QueryCommand, GetCommand } = require('@aws-sdk/lib-dynamodb')
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb')
const crypto  = require('crypto')
const { v4: uuidv4 } = require('uuid')

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-south-1' }),
  { marshallOptions: { removeUndefinedValues: true } }
)

const USERS_TABLE = process.env.DYNAMODB_USERS_TABLE || 'apkaai-users'

// ── Simple hash (no bcrypt dependency needed) ─────────────────────────────────
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + process.env.PASSWORD_SALT || 'apkaai2026').digest('hex')
}

// ── Simple JWT-like token (base64 encoded, signed) ────────────────────────────
function createToken(userId, email) {
  const payload = Buffer.from(JSON.stringify({ userId, email, iat: Date.now() })).toString('base64')
  const sig     = crypto.createHmac('sha256', process.env.JWT_SECRET || 'apkaai-secret-2026').update(payload).digest('hex').slice(0, 16)
  return `${payload}.${sig}`
}

function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const expected = crypto.createHmac('sha256', process.env.JWT_SECRET || 'apkaai-secret-2026').update(payload).digest('hex').slice(0, 16)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64').toString())
  } catch { return null }
}

// ── POST /api/auth/register ───────────────────────────────────────────────────
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password } = req.body

    // Validate
    if (!name || !email || !password) return res.status(400).json({ error: 'name, email and password are required' })
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' })
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' })

    // Check if email already exists
    const existing = await dynamo.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase() },
      Limit: 1,
    }))
    if (existing.Items && existing.Items.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists. Please sign in.' })
    }

    const userId = uuidv4()
    const user   = {
      userId,
      email:     email.toLowerCase().trim(),
      name:      name.trim(),
      password:  hashPassword(password),
      createdAt: new Date().toISOString(),
      role:      'user',
    }

    await dynamo.send(new PutCommand({ TableName: USERS_TABLE, Item: user }))

    const token = createToken(userId, user.email)
    res.status(201).json({
      success: true,
      token,
      user: { userId, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) { next(err) }
})

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body

    if (!email || !password) return res.status(400).json({ error: 'Email and password are required' })

    // Find user by email
    const result = await dynamo.send(new QueryCommand({
      TableName: USERS_TABLE,
      IndexName: 'email-index',
      KeyConditionExpression: 'email = :e',
      ExpressionAttributeValues: { ':e': email.toLowerCase().trim() },
      Limit: 1,
    }))

    if (!result.Items || result.Items.length === 0) {
      return res.status(401).json({ error: 'No account found with this email. Please sign up first.' })
    }

    const user = result.Items[0]
    if (user.password !== hashPassword(password)) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' })
    }

    const token = createToken(user.userId, user.email)
    res.json({
      success: true,
      token,
      user: { userId: user.userId, name: user.name, email: user.email, role: user.role },
    })
  } catch (err) { next(err) }
})

// ── GET /api/auth/me (protected) ──────────────────────────────────────────────
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Not authenticated' })
    }
    const token  = authHeader.split(' ')[1]
    const decoded = verifyToken(token)
    if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })

    const result = await dynamo.send(new GetCommand({
      TableName: USERS_TABLE,
      Key: { userId: decoded.userId },
    }))
    if (!result.Item) return res.status(404).json({ error: 'User not found' })

    const { password: _, ...safeUser } = result.Item
    res.json({ user: safeUser })
  } catch (err) { next(err) }
})

module.exports = router
