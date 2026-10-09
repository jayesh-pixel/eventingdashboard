const GOOGLE_MAPS_EMBED_HOST = "www.google.com"
const GOOGLE_MAPS_EMBED_PATH = "/maps/embed"

export const GOOGLE_MAPS_EMBED_ERROR =
  "Paste the Google Maps embed code from Google Maps > Share > Embed a map > Copy HTML."

/**
 * Accept Google's current or older iframe markup (and a bare embed URL), then
 * return the exact iframe shape expected by the venue API.
 *
 * Google occasionally changes nonessential iframe attributes such as
 * `referrerpolicy`. Validating the complete copied HTML made those changes
 * prevent venue creation even though the embedded map URL was still valid.
 */
export const normalizeGoogleMapsEmbed = (value: string): string | null => {
  const trimmed = value.trim()
  if (!trimmed) return null

  const iframeMatch = trimmed.match(
    /^<iframe\b[^>]*\bsrc\s*=\s*(["'])([\s\S]*?)\1[^>]*>\s*<\/iframe>$/i,
  )
  const source = iframeMatch ? iframeMatch[2] : trimmed
  const decodedSource = source
    .replace(/&amp;/gi, "&")
    .replace(/&#0*38;/gi, "&")
    .replace(/&#x0*26;/gi, "&")

  // A non-iframe value must be only the URL, not arbitrary HTML or text.
  if (!iframeMatch && /[\s<>"']/.test(decodedSource)) return null

  try {
    const url = new URL(decodedSource)
    const isGoogleMapsEmbed =
      url.protocol === "https:" &&
      url.hostname === GOOGLE_MAPS_EMBED_HOST &&
      url.port === "" &&
      url.pathname === GOOGLE_MAPS_EMBED_PATH &&
      Boolean(url.searchParams.get("pb")) &&
      !url.hash

    if (!isGoogleMapsEmbed) return null

    return `<iframe src="${url.toString()}" width="600" height="450" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>`
  } catch {
    return null
  }
}
