import { NextRequest } from "next/server"

const json = (data: unknown, init?: ResponseInit) =>
  new Response(JSON.stringify(data), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  })

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  })
}

export async function POST(req: NextRequest) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://devapi.eventingclub.in"

  let payload: unknown
  try {
    payload = await req.json()
  } catch {
    return json({ error: true, message: "Invalid JSON body" }, { status: 400 })
  }

  const upstreamUrl = `${baseUrl.replace(/\/$/, "")}/promocode/create`
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")

  let upstream: Response
  try {
    upstream = await fetch(upstreamUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { Authorization: authHeader } : {}),
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    })
  } catch (error: any) {
    return json(
      {
        error: true,
        message: error?.message || "Failed to reach upstream API",
      },
      { status: 502 }
    )
  }

  const contentType = upstream.headers.get("content-type") || "application/json"
  const bodyText = await upstream.text()

  return new Response(bodyText, {
    status: upstream.status,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "no-store",
    },
  })
}
