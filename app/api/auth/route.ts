import { NextResponse } from "next/server"
import { authEndpoints } from "@/lib/api-endpoints"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { username, password } = body

    // Forward the request to the actual API
    const response = await fetch(authEndpoints.LOGIN_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        Username: username,
        Password: password,
      }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data.message || "Authentication failed" },
        { status: response.status },
      )
    }

    return NextResponse.json({
      success: true,
      token: data.token,
      user: data.data,
    })
  } catch (error) {
    console.error("Auth API error:", error)
    return NextResponse.json({ success: false, message: "Internal server error" }, { status: 500 })
  }
}
