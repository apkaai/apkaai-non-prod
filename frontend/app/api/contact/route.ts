import { NextRequest, NextResponse } from 'next/server'

// Forwards contact form submissions to the Express backend.
// Falls back to a local acknowledgment if the backend is unreachable,
// so the user always gets a success response rather than a hard error.
const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, subject, message } = body

    // Basic server-side validation
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }
    if (!email || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Valid email is required' }, { status: 400 })
    }
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Forward to Express backend
    const backendRes = await fetch(`${BACKEND_URL}/api/contact`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || 'General inquiry',
        message: message.trim(),
      }),
    })

    if (!backendRes.ok) {
      const errorText = await backendRes.text()
      console.error('[contact route] Backend returned error:', backendRes.status, errorText)
      return NextResponse.json(
        { error: 'Failed to send message. Please try again.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err) {
    console.error('[contact route] Unexpected error:', err)
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please email us directly.' },
      { status: 500 }
    )
  }
}
