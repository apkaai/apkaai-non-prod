/**
 * pdfService.js — Branded PDF invoice generator (pdfkit)
 * ─────────────────────────────────────────────────────────────────────────────
 * generateInvoicePDF(order) → Promise<Buffer>
 *
 * order shape:
 * {
 *   order_id, created_at, status, payment_id,
 *   subtotal, discount, tax, total, coupon_code,
 *   items: [{ tool_name, tool_logo, plan_name, billing_cycle, plan_price }],
 *   user: { name, email }
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require('pdfkit')

// ─── Colour palette ───────────────────────────────────────────────────────────
const C = {
  DARK:       '#0F0A1E',
  PURPLE:     '#7C3AED',
  PURPLE_LT:  '#A78BFA',
  WHITE:      '#FFFFFF',
  GREY:       '#94A3B8',
  LIGHT_GREY: '#E2E8F0',
  GREEN:      '#059669',
  AMBER:      '#D97706',
}

/**
 * generateInvoicePDF — returns a Buffer containing the PDF
 */
function generateInvoicePDF(order) {
  return new Promise((resolve, reject) => {
    const doc      = new PDFDocument({ margin: 48, size: 'A4' })
    const buffers  = []
    doc.on('data',  chunk => buffers.push(chunk))
    doc.on('end',   ()    => resolve(Buffer.concat(buffers)))
    doc.on('error', err   => reject(err))

    const pageW    = doc.page.width  - 96   // usable width
    const user     = order.user || { name: 'Customer', email: '' }
    const items    = order.items || []
    const invoiceNo = `INV-${order.order_id.slice(0, 8).toUpperCase()}`
    const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', { dateStyle: 'long' })
    const year      = new Date().getFullYear()

    // ── Header bar ────────────────────────────────────────────────────────────
    doc.rect(0, 0, doc.page.width, 72).fill(C.DARK)
    doc.fontSize(24).fillColor(C.WHITE).font('Helvetica-Bold')
       .text('apka', 48, 24, { continued: true })
       .fillColor(C.PURPLE_LT).text('AI')
    doc.fontSize(9).fillColor('#94A3B8').font('Helvetica')
       .text("World's #1 AI Tools Marketplace", 48, 50)
    doc.fontSize(11).fillColor(C.WHITE).font('Helvetica-Bold')
       .text('TAX INVOICE', doc.page.width - 130, 30, { width: 82, align: 'right' })
    doc.fontSize(9).fillColor(C.PURPLE_LT).font('Helvetica')
       .text(invoiceNo, doc.page.width - 130, 46, { width: 82, align: 'right' })

    // ── Divider ───────────────────────────────────────────────────────────────
    doc.moveDown(3.5)
    const startY = 90

    // ── Bill To + Invoice Details (two columns) ────────────────────────────────
    // Left — Bill To
    doc.fontSize(8).fillColor(C.GREY).font('Helvetica')
       .text('BILL TO', 48, startY, { characterSpacing: 1 })
    doc.fontSize(13).fillColor('#1E293B').font('Helvetica-Bold')
       .text(user.name, 48, startY + 14)
    doc.fontSize(10).fillColor(C.GREY).font('Helvetica')
       .text(user.email, 48, startY + 30)

    // Right — Invoice details
    const detailX = 380
    const labelW  = 90
    const valueX  = detailX + labelW + 6
    const rows = [
      ['Invoice No',  invoiceNo],
      ['Date',        orderDate],
      ['Status',      (order.status || 'completed').charAt(0).toUpperCase() + (order.status || 'completed').slice(1)],
      ...(order.payment_id ? [['Payment ID', order.payment_id.slice(0, 20)]] : []),
    ]
    rows.forEach(([label, value], i) => {
      const y = startY + i * 17
      doc.fontSize(9).fillColor(C.GREY).font('Helvetica').text(label, detailX, y)
      doc.fontSize(9).fillColor('#1E293B').font('Helvetica-Bold').text(value, valueX, y)
    })

    // ── Horizontal rule ────────────────────────────────────────────────────────
    const ruleY = startY + 70
    doc.moveTo(48, ruleY).lineTo(doc.page.width - 48, ruleY)
       .strokeColor(C.LIGHT_GREY).lineWidth(0.5).stroke()

    // ── Items table header ─────────────────────────────────────────────────────
    const tableTop = ruleY + 16
    doc.rect(48, tableTop, pageW, 22).fill('#F8F7FF')
    doc.fontSize(8).fillColor(C.GREY).font('Helvetica-Bold')
    ;[
      ['ITEM / TOOL',    48,  200],
      ['PLAN',          260,   80],
      ['BILLING',       350,   70],
      ['AMOUNT',        doc.page.width - 100, 52],
    ].forEach(([label, x, w]) =>
      doc.text(label, x + 4, tableTop + 7, { width: w, characterSpacing: 0.5 })
    )

    // ── Items rows ─────────────────────────────────────────────────────────────
    let rowY = tableTop + 28
    items.forEach((item, i) => {
      if (i % 2 === 0) doc.rect(48, rowY - 5, pageW, 26).fill('#FAFAFA')
      doc.fontSize(10).fillColor('#1E293B').font('Helvetica-Bold')
         .text(item.tool_name || '', 56, rowY, { width: 195 })
      doc.fontSize(9).fillColor(C.GREY).font('Helvetica')
         .text(item.plan_name ? `${item.plan_name} Plan` : '', 264, rowY + 1, { width: 75 })
         .text(item.billing_cycle || '', 354, rowY + 1, { width: 65 })
      doc.fontSize(10).fillColor(C.PURPLE).font('Helvetica-Bold')
         .text(item.plan_price || '', doc.page.width - 96, rowY, { width: 48, align: 'right' })
      rowY += 28
    })

    // ── Totals ─────────────────────────────────────────────────────────────────
    const totalsX = 340
    rowY += 8
    doc.moveTo(48, rowY).lineTo(doc.page.width - 48, rowY)
       .strokeColor(C.LIGHT_GREY).lineWidth(0.5).stroke()
    rowY += 14

    const fmtINR = n => `\u20B9${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`

    const totals = [
      { label: 'Subtotal',   value: fmtINR(order.subtotal), color: '#475569' },
      ...(Number(order.discount) > 0
        ? [{ label: order.coupon_code ? `Discount (${order.coupon_code})` : 'Discount', value: `\u2212${fmtINR(order.discount)}`, color: C.GREEN }]
        : []),
      { label: 'GST (18%)', value: fmtINR(order.tax),      color: '#475569' },
    ]
    totals.forEach(t => {
      doc.fontSize(10).fillColor(C.GREY).font('Helvetica').text(t.label, totalsX, rowY)
      doc.fontSize(10).fillColor(t.color).font('Helvetica-Bold')
         .text(t.value, totalsX + 90, rowY, { width: doc.page.width - 48 - totalsX - 90, align: 'right' })
      rowY += 18
    })

    // ── Total box ──────────────────────────────────────────────────────────────
    rowY += 4
    doc.rect(totalsX, rowY, doc.page.width - 48 - totalsX, 30).fill(C.DARK)
    doc.fontSize(12).fillColor(C.WHITE).font('Helvetica-Bold')
       .text('TOTAL PAID', totalsX + 8, rowY + 9)
    doc.text(fmtINR(order.total), totalsX + 8, rowY + 9,
       { width: doc.page.width - 48 - totalsX - 16, align: 'right' })

    // ── Payment note ───────────────────────────────────────────────────────────
    if (order.payment_id) {
      rowY += 42
      doc.fontSize(8).fillColor(C.GREY).font('Helvetica')
         .text(`Transaction ID: ${order.payment_id}`, 48, rowY)
    }

    // ── Footer ─────────────────────────────────────────────────────────────────
    const footerY = doc.page.height - 52
    doc.moveTo(48, footerY).lineTo(doc.page.width - 48, footerY)
       .strokeColor(C.LIGHT_GREY).lineWidth(0.5).stroke()
    doc.fontSize(8).fillColor(C.GREY).font('Helvetica')
       .text(
         `Thank you for choosing ApkaAI  |  apkaai.com  |  support@apkaai.com  |  \u00A9 ${year} ApkaAI`,
         48, footerY + 10,
         { width: pageW, align: 'center' }
       )

    doc.end()
  })
}

module.exports = { generateInvoicePDF }
