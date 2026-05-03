# Deployment Notes

## Socket.IO & Vercel

Vercel's serverless functions don't support persistent WebSocket connections, so
Socket.IO **won't work on Vercel**. The rest of the app (recipes, planner, shopping list
without real-time sync) works fine on Vercel.

### For full real-time shopping list, deploy to:

**Railway** (recommended — easiest)
1. Push to GitHub
2. New project → Deploy from GitHub
3. Set `POSTGRES_URL` env var
4. Railway auto-detects `npm start` = `node server.js` ✓

**Render**
1. New Web Service → connect repo
2. Build: `npm install && npm run build`
3. Start: `node server.js`
4. Set `POSTGRES_URL` env var

**Fly.io / DigitalOcean App Platform / any VPS** — all work fine.

### If you want to keep Vercel anyway:
The shopping list will still work, just without real-time sync between shoppers.
The checked state will be local to each browser. Everything else is unaffected.
