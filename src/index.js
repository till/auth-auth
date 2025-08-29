import { serve } from "@hono/node-server";
import app from "./app/app.js";
import appConfig from "../config.js";

serve(
  {
    fetch: app.fetch,
    port: appConfig.port,
  },
  (info) => {
    console.log(`Server is running on http://${appConfig.host}:${info.port}`);
  },
);
