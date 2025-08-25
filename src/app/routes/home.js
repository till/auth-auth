import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../components/layout.js";
import { LoginStatus } from "../components/home.js";

export default new Hono().get("/", async (c) => {
  const user = c.get("user");
  return c.html(
    Layout({
      title: "Auth Demo",
      children: html`
        <h1>Authentication Demo</h1>
        ${LoginStatus({ user })}
      `,
    }),
  );
});
