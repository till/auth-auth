import { html } from 'hono/html'

// Form section wrapper
export const FormSection = ({ children }) => html`
  <div class="form-section">
    ${children}
  </div>
`

// Message display component
export const Message = ({ error, success }) => html`
  ${error ? html`<div class="error">${decodeURIComponent(error)}</div>` : ''}
  ${success ? html`<div class="success">${decodeURIComponent(success)}</div>` : ''}
`
