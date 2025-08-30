import { serve } from "@hono/node-server";
import app from "./app/app.js";
import appConfig from "../config.js";

const server = serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`Server is running on http://${appConfig.host}:${info.port}`);
  },
);

// graceful shutdown
process.on("SIGINT", () => {
  server.close();
  process.exit(0);
});
process.on("SIGTERM", () => {
  server.close((err) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    process.exit(0);
  });
});
