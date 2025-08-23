import { serve } from '@hono/node-server'
import app from './app/app.js'

const port = process.env.PORT || 3000

serve({
  fetch: app.fetch,
  port: port
}, (info) => {
  console.log(`Server is running on http://localhost:${info.port}`)
})
