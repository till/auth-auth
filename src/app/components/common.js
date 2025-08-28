import { html } from "hono/html";

// Form section wrapper
export const FormSection = ({ children }) => html` <div>${children}</div> `;

// Message display component
export const Message = ({ error, success }) => html`
  ${error ? html`<div>${decodeURIComponent(error)}</div>` : ""}
  ${success ? html`<div>${decodeURIComponent(success)}</div>` : ""}
`;
