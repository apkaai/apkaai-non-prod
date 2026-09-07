const { query } = require('../lib/db')

// ── GET /api/categories ───────────────────────────────────────────────────────
async function listCategories(req, res, next) {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name ASC', [])
    res.json({ categories: result.rows, count: result.rowCount })
  } catch (err) { next(err) }
}

// ── GET /api/categories/:slug ─────────────────────────────────────────────────
async function getCategoryBySlug(req, res, next) {
  try {
    const catResult = await query('SELECT * FROM categories WHERE slug = $1', [req.params.slug])
    if (catResult.rowCount === 0) return res.status(404).json({ error: 'Category not found' })

    const toolsResult = await query(
      'SELECT * FROM tools WHERE category_slug = $1 ORDER BY reviews DESC',
      [req.params.slug]
    )
    res.json({ category: catResult.rows[0], tools: toolsResult.rows, toolCount: toolsResult.rowCount })
  } catch (err) { next(err) }
}

module.exports = { listCategories, getCategoryBySlug }
