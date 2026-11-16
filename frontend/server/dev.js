// Local API server: `npm run api` (Vite proxies /api here during `npm run dev`)
import app from './app.js'

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`))
