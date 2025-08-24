import { Hono } from 'hono'
import { serveStatic } from '@hono/node-server/serve-static'
import { logger } from 'hono/logger'

import { auth } from '../../auth.js'

import authHandler from './routes/auth.js'
import homeHandler from './routes/home.js'
import profileHandler from './routes/profile.js'
import whoamiHandler from './routes/whoami.js'
import adminHandler from './routes/admin.js'


// demo
import demoHandler from './demo/routes.js'

const app = new Hono()

// register middlewares
app.use(logger())

// Better-auth API routes
app.on(["POST", "GET"], "/api/auth/*", (c) => {
  return auth.handler(c.req.raw)
})

// Session middleware - adds user and session to context
app.use("*", async (c, next) => {
  try {
    const session = await auth.api.getSession({ 
      headers: c.req.raw.headers 
    });

    console.log(session)
    
    c.set("user", session?.user || null);
    c.set("session", session?.session || null);
  } catch (error) {
    c.set("user", null);
    c.set("session", null);
  }
  
  return next();
})

// register all route handlers
app.route('/', authHandler)
app.route('/', homeHandler)
app.route('/', profileHandler)
app.route('/', whoamiHandler)
app.route('/', adminHandler)


app.route('/demo', demoHandler)

// serve assets, etc.
app.use('/static/*', serveStatic({ root: './' }))

export default app
