import { NextResponse } from "next/server"

const LOGIN_PATHS = {
  superadmin: "/superadmin/login",
  organizer: "/organizer/login",
  promoter: "/promoter/login",
} as const

type LoginRole = keyof typeof LOGIN_PATHS

const isLoginRole = (value: unknown): value is LoginRole =>
  typeof value === "string" && value in LOGIN_PATHS

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { role, username, password } = body

    if (!isLoginRole(role) || typeof username !== "string" || typeof password !== "string") {
      return NextResponse.json(
        { error: true, message: "Role, username, and password are required" },
        { status: 400 },
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/+$/, "")
    if (!baseUrl) {
      console.error("Auth API error: NEXT_PUBLIC_API_BASE_URL is not configured")
      return NextResponse.json(
        { error: true, message: "Login service is not configured" },
        { status: 503 },
      )
    }

    // Proxy login through the same origin so browser CORS/network failures do not
    // hide the backend's actual response behind a generic "Failed to fetch".
    const response = await fetch(`${baseUrl}${LOGIN_PATHS[role]}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Username: username,
        Password: password,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    })

    const responseText = await response.text()
    let data: Record<string, unknown> | null = null
    try {
      data = JSON.parse(responseText)
    } catch {
      // nginx and other gateways commonly return an HTML body for 5xx errors.
    }

    if (!response.ok) {
      if (response.status >= 500) {
        return NextResponse.json(
          { error: true, message: "Login service is temporarily unavailable. Please try again shortly." },
          { status: 503 },
        )
      }

      return NextResponse.json(
        {
          error: true,
          message: typeof data?.message === "string" ? data.message : "Authentication failed",
        },
        { status: response.status },
      )
    }

    if (!data) {
      return NextResponse.json(
        { error: true, message: "Login service returned an invalid response" },
        { status: 502 },
      )
    }

    // Preserve the backend's response contract consumed by the login pages.
    return NextResponse.json(data)
  } catch (error) {
    console.error("Auth API error:", error)
    return NextResponse.json(
      { error: true, message: "Login service is temporarily unavailable. Please try again shortly." },
      { status: 503 },
    )
  }
}
