import { Hono } from "hono";
import { html } from "hono/html";
import { Layout } from "../components/layout.js";
import { Message } from "../components/common.js";
import { UserInfo } from "../components/profile.js";

export default new Hono().get("/profile", async (c) => {
  // Profile page
  const user = c.get("user");
  if (!user) return c.redirect("/login?error=no+session");

  const error = c.req.query("error");
  const success = c.req.query("success");

  return c.html(
    Layout({
      title: "Profile",
      children: html`
        <h1>Profile</h1>

        ${Message({ error, success })} ${UserInfo({ user })}

        <form method="post" action="/logout">
          <button type="submit">Logout</button>
        </form>
        <a href="/">Back to Home</a>
      `,
    }),
  );
});
