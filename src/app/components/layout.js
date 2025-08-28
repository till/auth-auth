import { html } from "hono/html";

// Base layout component
export const Layout = ({ title, children }) => html`
  <!DOCTYPE html>
  <html>
    <head>
      <title>${title}</title>
      <link rel="stylesheet" href="/static/app.css" />
    </head>
    <body>
      <div class="container">${children}</div>
      <script type="module" src="/static/auth-client.js"></script>
    </body>
  </html>
`;
// Navigation component
export const Navigation = ({ back, extra }) => html`
  <a href="${back.href}">← ${back.text}</a>
  ${extra ? html` | <a href="${extra.href}">${extra.text}</a>` : ""}
`;
