/**
 * Middleware: Require requests to come from the app (Referer/Origin check).
 * Prevents direct URL access from outside while allowing in-app image loading without auth.
 * Used for non-sensitive assets: background images, stickers.
 */

function getAllowedOrigins() {
  const origins = new Set()
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const apiUrl = process.env.API_URL || process.env.VITE_API_URL || 'http://localhost:5000/api'

  // Add CLIENT_URL (may be comma-separated for multiple domains)
  clientUrl.split(',').forEach((u) => {
    const trimmed = u.trim()
    if (trimmed) {
      try {
        origins.add(new URL(trimmed).origin)
      } catch {
        origins.add(trimmed)
      }
    }
  })

  // Add API base origin (same-domain deployments)
  try {
    origins.add(new URL(apiUrl).origin)
  } catch {
    // ignore
  }

  // Dev: localhost and 127.0.0.1 on common ports
  const ports = [5173, 3000, 5000, 8080]
  ;['localhost', '127.0.0.1'].forEach((host) => {
    ports.forEach((port) => {
      origins.add(`http://${host}:${port}`)
      origins.add(`https://${host}:${port}`)
    })
  })

  return origins
}

const allowedOrigins = getAllowedOrigins()

// In dev: allow requests without Referer (browser may not send it for img.src)
const ALLOW_NO_REFERER_IN_DEV = process.env.ALLOW_NO_REFERER_IN_DEV === '1'

function requireAppOrigin(req, res, next) {
  const referer = req.get('Referer')
  const origin = req.get('Origin')

  const requestOrigin = (() => {
    if (origin) {
      try {
        return new URL(origin).origin
      } catch {
        return null
      }
    }
    if (referer) {
      try {
        return new URL(referer).origin
      } catch {
        return null
      }
    }
    return null
  })()

  const allowedByOrigin = requestOrigin && allowedOrigins.has(requestOrigin)
  const allowedNoReferer = !requestOrigin && ALLOW_NO_REFERER_IN_DEV
  const allowed = allowedByOrigin || allowedNoReferer

  if (allowed) {
    return next()
  }

  res.status(403).json({ error: 'Direct access not allowed' })
}

module.exports = { requireAppOrigin }
