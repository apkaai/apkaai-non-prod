const { query } = require('../lib/db')

// ── GET /api/tools ─────────────────────────────────────────────────────────────
async function listTools(req, res, next) {
  try {
    const { category, pricing, search, sort = 'popular', limit = 100 } = req.query
    const params = []
    const where  = []
    let idx = 1

    if (category) { where.push(`category_slug = $${idx++}`); params.push(category) }

    if (pricing && pricing !== 'All') {
      where.push(`pricing = $${idx++}`)
      params.push(pricing)
    }

    if (search && search.trim()) {
      const q = `%${search.trim().toLowerCase()}%`
      where.push(`(LOWER(name) LIKE $${idx} OR LOWER(tagline) LIKE $${idx} OR LOWER(description) LIKE $${idx} OR EXISTS (SELECT 1 FROM unnest(tags) t WHERE LOWER(t) LIKE $${idx}))`)
      params.push(q)
      idx++
    }

    const orderMap = {
      popular: 'reviews DESC',
      rating:  'rating DESC',
      new:     'is_new DESC, created_at DESC',
      name:    'name ASC',
    }
    const orderBy = orderMap[sort] || 'reviews DESC'

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''
    const sql = `
      SELECT id, slug, name, tagline, description, category, category_slug,
             logo, website, pricing, starting_price, monthly_price,
             rating, reviews, tags, featured, is_new, badge, pricing_plans
      FROM tools
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${idx}
    `
    params.push(parseInt(limit, 10))

    const result = await query(sql, params)
    res.json({ tools: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
}

// ── GET /api/tools/featured ────────────────────────────────────────────────────
async function getFeatured(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM tools WHERE featured = TRUE ORDER BY reviews DESC LIMIT 20',
      []
    )
    res.json({ tools: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
}

// ── GET /api/tools/:slug ───────────────────────────────────────────────────────
async function getToolBySlug(req, res, next) {
  try {
    const result = await query(
      'SELECT * FROM tools WHERE slug = $1',
      [req.params.slug]
    )
    if (result.rowCount === 0) return res.status(404).json({ error: 'Tool not found' })
    res.json({ tool: result.rows[0] })
  } catch (err) { next(err) }
}

module.exports = { listTools, getFeatured, getToolBySlug }
