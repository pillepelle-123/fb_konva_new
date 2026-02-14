# Rate Limit Debugging

## Problem
"Too Many Requests" (429) errors occur when the API exceeds 150 requests per 15 minutes per IP.

## Debug Tools

### 1. Automatic Console Summary
The server logs a **top endpoints** summary when request counts reach 100, 140, and 150. Restart the server, load the app, and watch the terminal output.

### 2. Stats Endpoint
Open in browser (or `curl`):
```
http://localhost:5000/api/debug/request-stats
```
Returns JSON with total requests and counts per endpoint. This endpoint is excluded from rate limiting.

### 3. Verbose Logging
Set `DEBUG_RATE_LIMIT=1` to log every single API request:
```bash
# Windows (PowerShell)
$env:DEBUG_RATE_LIMIT="1"; npm run dev

# Windows (cmd)
set DEBUG_RATE_LIMIT=1 && npm run dev

# Linux/macOS
DEBUG_RATE_LIMIT=1 npm run dev
```
Or add to `.env`:
```
DEBUG_RATE_LIMIT=1
```

### 4. On 429
When the rate limit is hit, the server logs the top 10 request sources to the console.

## Likely Culprits (from previous analysis)
- **background-images/:id/file** – SVG preload in `loadBackgroundImageRegistry()` fetches each vector image
- **stickers/:id/file** – SVG preload in `loadStickerRegistry()` fetches each vector sticker  
- **books/:id** – Each `BookCard` fetches full book data for preview
- **users/:id** – Each `ProfilePicture` checks if user has profile picture
