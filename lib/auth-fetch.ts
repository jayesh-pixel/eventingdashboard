import { getValidToken } from "@/lib/token-utils"

/**
 * Drop-in replacement for fetch() that attaches the logged-in user's
 * Bearer token to every request.
 *
 * The token is always read fresh from storage (via getValidToken) so it is
 * never stale or malformed, and it overrides any Authorization header the
 * caller passed in.
 */
export function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  const token = typeof window !== "undefined" ? getValidToken() : null

  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  return fetch(input, { ...init, headers })
}
