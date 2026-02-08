import { Hono } from "hono";
import { pinoLogger } from "hono-pino";
import { serveStatic } from "@hono/node-server/serve-static";

import authHandler from "./routes/auth.js";
import homeHandler from "./routes/home.js";
import profileHandler from "./routes/profile.js";
import whoamiHandler from "./routes/whoami.js";
import adminHandler from "./routes/admin.js";

// demo
import demoHandler from "./demo/routes.js";

export function createApp(auth) {
  // Validate auth instance
  if (!auth?.api?.getSession) {
    throw new Error("Invalid auth instance passed to createApp");
  }

  const app = new Hono();

  // register middlewares
  app.use(
    pinoLogger({
      pino: {
        level: "debug",
        formatters: {
          level: (label) => {
            return { level: label };
          },
        },
        redact: [
          "req.headers.cookie",
          "req.headers.authorization",
          'req.headers["user-agent"]',
        ],
      },
    }),
  );

  // Auth context middleware - makes auth available to all routes
  app.use("*", (c, next) => {
    c.set("auth", auth);
    return next();
  });

  // Better-auth API routes
  app.on(["POST", "GET"], "/api/auth/*", (c) => {
    return auth.handler(c.req.raw);
  });

  // Session middleware - adds user and session to context
  app.use("*", async (c, next) => {
    const authInstance = c.get("auth");
    try {
      const session = await authInstance.api.getSession({
        headers: c.req.raw.headers,
      });

      console.log(session);

      c.set("user", session?.user || null);
      c.set("session", session?.session || null);
    } catch (error) {
      console.error(`Failed to set user in session: ${error}`);
      c.set("user", null);
      c.set("session", null);
    }

    return next();
  });

  // register all route handlers
  app.route("/", authHandler);
  app.route("/", homeHandler);
  app.route("/", profileHandler);
  app.route("/", whoamiHandler);
  app.route("/", adminHandler);

  app.route("/demo", demoHandler);

  // serve assets, etc.
  app.use("/static/*", serveStatic({ root: "./" }));

  return app;
}
