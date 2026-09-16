require('dotenv').config()
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const morgan = require('morgan')
const rateLimit = require('express-rate-limit')

const toolsRouter      = require('./routes/tools')
const categoriesRouter = require('./routes/categories')
const contactRouter    = require('./routes/contact')
const authRouter       = require('./routes/auth')
const adminRouter      = require('./routes/admin')
const analyticsRouter  = require('./routes/analytics')
const cloudRouter      = require('./routes/cloud')

const app = express()
const PORT = process.env.PORT || 4000

// ── Security & Middleware ─────────────────────────────────────────────────────
app.use(helmet())
app.use(morgan('dev'))
app.use(express.json())

// CORS — allow Next.js frontend
app.use(cors({
  origin: [
    process.env.FRONTEND_URL || 'https://apkaai.com',
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Global rate limiter: 100 requests per 15 minutes per IP
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
}))

// ── Routes ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'apkaai-api', timestamp: new Date().toISOString() })
})

app.use('/api/tools',      toolsRouter)
app.use('/api/categories', categoriesRouter)
app.use('/api/contact',    contactRouter)
app.use('/api/auth',       authRouter)
app.use('/api/admin',      adminRouter)
app.use('/api/analytics',  analyticsRouter)
app.use('/api/cloud',      cloudRouter)

// ── 404 Handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// ── Global Error Handler ──────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('[Error]', err.message)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  })
})

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ ApkaAI API running on http://localhost:${PORT}`)
  console.log(`   Environment : ${process.env.NODE_ENV || 'development'}`)
  console.log(`   AWS Region  : ${process.env.AWS_REGION || 'ap-south-1'}`)
})

module.exports = app
