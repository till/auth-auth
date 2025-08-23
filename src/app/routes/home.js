import { Hono } from 'hono'
import { html } from 'hono/html'
import { Layout, LoginStatus } from './../../components.js'
import { auth } from '../../../auth.js'

export default new Hono()
  .get('/', async (c) => {
    const user = c.get('user');
    return c.html(Layout({ 
      title: 'Auth Demo',
      children: html`
        <h1>Authentication Demo</h1>
        ${LoginStatus({ user })}
      `
    }))
  })