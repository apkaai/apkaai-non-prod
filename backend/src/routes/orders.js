const express = require('express')
const router  = express.Router()
const crypto  = require('crypto')
const { query } = require('../lib/db')

// ─────────────────────────────────────────────────────────────────────────────
// Auth helpers — reuse same HMAC token scheme as auth.js
// ─────────────────────────────────────────────────────────────────────────────
function verifyToken(token) {
  try {
    const [payload, sig] = token.split('.')
    const secret   = process.env.JWT_SECRET || 'apkaai-jwt-secret-2026'
    const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex').slice(0, 32)
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(payload, 'base64url').toString())
  } catch { return null }
}

// Middleware: any authenticated user
function requireAuth(req, res, next) {
  const auth = req.headers.authorization
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Not authenticated' })
  }
  const decoded = verifyToken(auth.split(' ')[1])
  if (!decoded) return res.status(401).json({ error: 'Invalid or expired token' })
  req.user = decoded
  next()
}

// Middleware: admin only
function adminOnly(req, res, next) {
  requireAuth(req, res, async () => {
    try {
      const result = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
      if (result.rows[0]?.role === 'admin') return next()
      return res.status(403).json({ error: 'Admin access required' })
    } catch (err) { next(err) }
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/orders
// Place a new order from cart items
// Body: { items: CartItem[], subtotal, discount, tax, total, couponCode }
// ─────────────────────────────────────────────────────────────────────────────
router.post('/', requireAuth, async (req, res, next) => {
  try {
    const { items, subtotal, discount, tax, total, couponCode } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Order must contain at least one item' })
    }

    // Create the order record
    const orderResult = await query(
      `INSERT INTO orders
         (user_id, status, subtotal, discount, tax, total, coupon_code, payment_method)
       VALUES ($1, 'pending', $2, $3, $4, $5, $6, 'razorpay')
       RETURNING *`,
      [
        req.user.userId,
        Number(subtotal)  || 0,
        Number(discount)  || 0,
        Number(tax)       || 0,
        Number(total)     || 0,
        couponCode || null,
      ]
    )
    const order = orderResult.rows[0]

    // Insert each item
    for (const item of items) {
      await query(
        `INSERT INTO order_items
           (order_id, tool_id, tool_name, tool_slug, tool_logo, tool_category,
            plan_name, plan_price, plan_monthly, billing_cycle, quantity)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
        [
          order.order_id,
          item.toolId       || '',
          item.toolName     || '',
          item.toolSlug     || '',
          item.toolLogo     || '',
          item.toolCategory || '',
          item.planName     || '',
          item.planPrice    || '',
          Number(item.planMonthly) || 0,
          item.billingCycle || 'monthly',
          Number(item.quantity) || 1,
        ]
      )
    }

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      orderId: order.order_id,
      order: { ...order, items },
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/my
// Get order history for the logged-in user
// ─────────────────────────────────────────────────────────────────────────────
router.get('/my', requireAuth, async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    // Get orders
    const ordersResult = await query(
      `SELECT * FROM orders
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.userId, Number(limit), offset]
    )

    // Get total count
    const countResult = await query(
      'SELECT COUNT(*) FROM orders WHERE user_id = $1',
      [req.user.userId]
    )

    // Attach items to each order
    const orders = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await query(
          'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
          [order.order_id]
        )
        return { ...order, items: itemsResult.rows }
      })
    )

    res.json({
      orders,
      total: parseInt(countResult.rows[0].count, 10),
      page:  Number(page),
      limit: Number(limit),
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:orderId
// Get a single order (owner or admin)
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:orderId', requireAuth, async (req, res, next) => {
  try {
    const orderResult = await query(
      'SELECT * FROM orders WHERE order_id = $1',
      [req.params.orderId]
    )
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = orderResult.rows[0]

    // Only owner or admin can view
    const userResult = await query('SELECT role FROM users WHERE user_id = $1', [req.user.userId])
    const isAdmin    = userResult.rows[0]?.role === 'admin'
    if (order.user_id !== req.user.userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [order.order_id]
    )
    res.json({ order: { ...order, items: itemsResult.rows } })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders  (admin only)
// Get all orders with user info, pagination, and optional status filter
// ─────────────────────────────────────────────────────────────────────────────
router.get('/', adminOnly, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query
    const offset = (Number(page) - 1) * Number(limit)

    let whereClause = ''
    const params = []

    if (status) {
      params.push(status)
      whereClause += ` AND o.status = $${params.length}`
    }
    if (search) {
      params.push(`%${search}%`)
      whereClause += ` AND (u.name ILIKE $${params.length} OR u.email ILIKE $${params.length})`
    }

    params.push(Number(limit), offset)

    const ordersResult = await query(
      `SELECT
         o.*,
         u.name  AS user_name,
         u.email AS user_email
       FROM orders o
       JOIN users u ON u.user_id = o.user_id
       WHERE 1=1 ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    )

    // Count query (without pagination params)
    const countParams = params.slice(0, params.length - 2)
    const countResult = await query(
      `SELECT COUNT(*) FROM orders o
       JOIN users u ON u.user_id = o.user_id
       WHERE 1=1 ${whereClause}`,
      countParams
    )

    // Attach items to each order
    const orders = await Promise.all(
      ordersResult.rows.map(async (order) => {
        const itemsResult = await query(
          'SELECT * FROM order_items WHERE order_id = $1',
          [order.order_id]
        )
        return { ...order, items: itemsResult.rows }
      })
    )

    // Summary stats
    const statsResult = await query(
      `SELECT
         COUNT(*)                                       AS total_orders,
         COUNT(*) FILTER (WHERE status = 'confirmed')  AS confirmed,
         COUNT(*) FILTER (WHERE status = 'completed')  AS completed,
         COUNT(*) FILTER (WHERE status = 'cancelled')  AS cancelled,
         COALESCE(SUM(total), 0)                        AS total_revenue
       FROM orders`,
      []
    )

    res.json({
      orders,
      total:  parseInt(countResult.rows[0].count, 10),
      page:   Number(page),
      limit:  Number(limit),
      stats:  statsResult.rows[0],
    })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:orderId/status  (admin only)
// Update order status
// Body: { status }
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:orderId/status', adminOnly, async (req, res, next) => {
  try {
    const { status } = req.body
    const validStatuses = ['pending', 'confirmed', 'processing', 'completed', 'cancelled', 'refunded']
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ error: `Status must be one of: ${validStatuses.join(', ')}` })
    }

    const result = await query(
      `UPDATE orders SET status = $1, updated_at = NOW()
       WHERE order_id = $2
       RETURNING *`,
      [status, req.params.orderId]
    )
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    res.json({ success: true, order: result.rows[0] })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/orders/:orderId/cancel  (user — within 24 hours)
// User cancels their own order
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:orderId/cancel', requireAuth, async (req, res, next) => {
  try {
    const orderResult = await query(
      'SELECT * FROM orders WHERE order_id = $1 AND user_id = $2',
      [req.params.orderId, req.user.userId]
    )
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = orderResult.rows[0]

    // Only pending/confirmed orders can be cancelled
    if (['cancelled', 'refunded', 'completed'].includes(order.status)) {
      return res.status(400).json({ error: `Order cannot be cancelled (current status: ${order.status})` })
    }

    // Enforce 24-hour window
    const hoursSinceOrder = (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60)
    if (hoursSinceOrder > 24) {
      return res.status(400).json({ error: 'Orders can only be cancelled within 24 hours of placement' })
    }

    const updated = await query(
      `UPDATE orders SET status = 'cancelled', updated_at = NOW()
       WHERE order_id = $1 RETURNING *`,
      [order.order_id]
    )
    res.json({ success: true, message: 'Order cancelled successfully', order: updated.rows[0] })
  } catch (err) { next(err) }
})

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/orders/:orderId/invoice  (owner or admin)
// Stream a PDF invoice for the order
// ─────────────────────────────────────────────────────────────────────────────
router.get('/:orderId/invoice', requireAuth, async (req, res, next) => {
  try {
    const orderResult = await query(
      'SELECT * FROM orders WHERE order_id = $1',
      [req.params.orderId]
    )
    if (orderResult.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' })
    }
    const order = orderResult.rows[0]

    // Access control — owner or admin
    const userResult = await query('SELECT name, email, role FROM users WHERE user_id = $1', [req.user.userId])
    const user       = userResult.rows[0]
    const isAdmin    = user?.role === 'admin'
    if (order.user_id !== req.user.userId && !isAdmin) {
      return res.status(403).json({ error: 'Access denied' })
    }

    // Fetch owner details (may differ from req.user if admin viewing)
    const ownerResult = await query('SELECT name, email FROM users WHERE user_id = $1', [order.user_id])
    const owner       = ownerResult.rows[0] || { name: 'Customer', email: '' }

    const itemsResult = await query(
      'SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at ASC',
      [order.order_id]
    )
    const items = itemsResult.rows

    // ── Build PDF ──────────────────────────────────────────────────────────
    const PDFDocument = require('pdfkit')
    const doc = new PDFDocument({ margin: 50, size: 'A4' })

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="apkaai-invoice-${order.order_id.slice(0,8).toUpperCase()}.pdf"`)
    doc.pipe(res)

    // Colours
    const PURPLE = '#7C3AED'
    const DARK   = '#1E1B4B'
    const GREY   = '#64748B'
    const WHITE  = '#FFFFFF'
    const pageW  = doc.page.width - 100   // usable width

    // ── Header bar ─────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 80).fill(DARK)
    doc.fontSize(22).fillColor(WHITE).font('Helvetica-Bold').text('apkaAI', 50, 28)
    doc.fontSize(10).fillColor('#A78BFA').font('Helvetica').text("World's #1 AI Tools Marketplace", 50, 54)
    doc.fontSize(10).fillColor(WHITE).text('INVOICE', doc.page.width - 120, 36, { width: 70, align: 'right' })

    // ── Invoice meta ────────────────────────────────────────────────────────
    doc.moveDown(3)
    const metaY = 110
    doc.fontSize(11).fillColor(GREY).font('Helvetica').text('Invoice To', 50, metaY)
    doc.fontSize(12).fillColor('#1E293B').font('Helvetica-Bold').text(owner.name, 50, metaY + 16)
    doc.fontSize(10).fillColor(GREY).font('Helvetica').text(owner.email, 50, metaY + 32)

    doc.fontSize(11).fillColor(GREY).text('Order ID', 350, metaY)
    doc.fontSize(11).fillColor(PURPLE).font('Helvetica-Bold').text(`#${order.order_id.slice(0,8).toUpperCase()}`, 350, metaY + 16)
    doc.fontSize(10).fillColor(GREY).font('Helvetica').text('Date', 350, metaY + 34)
    doc.fontSize(10).fillColor('#1E293B').text(new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' }), 350, metaY + 50)
    doc.fontSize(10).fillColor(GREY).text('Status', 350, metaY + 68)
    doc.fontSize(10).fillColor(order.status === 'completed' ? '#059669' : '#D97706').font('Helvetica-Bold')
       .text(order.status.charAt(0).toUpperCase() + order.status.slice(1), 350, metaY + 84)

    // ── Divider ─────────────────────────────────────────────────────────────
    doc.moveTo(50, 220).lineTo(doc.page.width - 50, 220).strokeColor('#E2E8F0').lineWidth(1).stroke()

    // ── Items table header ──────────────────────────────────────────────────
    const tableTop = 235
    doc.rect(50, tableTop, pageW, 24).fill('#F8F7FF')
    doc.fontSize(9).fillColor(GREY).font('Helvetica-Bold')
    doc.text('TOOL', 60, tableTop + 8)
    doc.text('PLAN', 280, tableTop + 8)
    doc.text('BILLING', 370, tableTop + 8)
    doc.text('AMOUNT', doc.page.width - 110, tableTop + 8, { width: 60, align: 'right' })

    // ── Items rows ──────────────────────────────────────────────────────────
    let rowY = tableTop + 32
    items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(50, rowY - 6, pageW, 26).fill('#FAFAFA')
      doc.fontSize(10).fillColor('#1E293B').font('Helvetica-Bold').text(item.tool_name, 60, rowY, { width: 210 })
      doc.fontSize(9).fillColor(GREY).font('Helvetica').text(item.plan_name + ' Plan', 280, rowY + 2)
      doc.text(item.billing_cycle, 370, rowY + 2)
      doc.fontSize(10).fillColor(PURPLE).font('Helvetica-Bold')
         .text(item.plan_price, doc.page.width - 110, rowY, { width: 60, align: 'right' })
      rowY += 32
    })

    // ── Totals ──────────────────────────────────────────────────────────────
    doc.moveTo(50, rowY + 4).lineTo(doc.page.width - 50, rowY + 4).strokeColor('#E2E8F0').stroke()
    rowY += 18

    const totals = [
      { label: 'Subtotal',  value: `₹${Number(order.subtotal).toLocaleString('en-IN')}`, color: '#334155' },
      ...(Number(order.discount) > 0 ? [{ label: `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}`, value: `-₹${Number(order.discount).toLocaleString('en-IN')}`, color: '#059669' }] : []),
      { label: 'GST (18%)', value: `₹${Number(order.tax).toLocaleString('en-IN')}`,      color: '#334155' },
    ]
    totals.forEach(t => {
      doc.fontSize(10).fillColor(GREY).font('Helvetica').text(t.label, 350, rowY)
      doc.fontSize(10).fillColor(t.color).font('Helvetica-Bold').text(t.value, doc.page.width - 110, rowY, { width: 60, align: 'right' })
      rowY += 20
    })

    // Total row
    rowY += 4
    doc.rect(350, rowY, pageW - 300, 28).fill(DARK)
    doc.fontSize(12).fillColor(WHITE).font('Helvetica-Bold').text('TOTAL PAID', 360, rowY + 8)
    doc.text(`₹${Number(order.total).toLocaleString('en-IN')}`, doc.page.width - 110, rowY + 8, { width: 60, align: 'right' })

    // Payment ID
    if (order.payment_id && order.payment_id !== 'razorpay') {
      rowY += 44
      doc.fontSize(9).fillColor(GREY).font('Helvetica').text(`Payment ID: ${order.payment_id}`, 50, rowY)
    }

    // ── Footer ──────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 60
    doc.moveTo(50, footerY).lineTo(doc.page.width - 50, footerY).strokeColor('#E2E8F0').stroke()
    doc.fontSize(9).fillColor(GREY).font('Helvetica')
       .text('Thank you for choosing ApkaAI — apkaai.com', 50, footerY + 10, { align: 'center', width: pageW })
    doc.text('Questions? ashutoshkumarpandey@apkaai.com', 50, footerY + 24, { align: 'center', width: pageW })

    doc.end()
  } catch (err) { next(err) }
})

module.exports = router
