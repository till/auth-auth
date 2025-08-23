import { Hono } from 'hono'
import { html } from 'hono/html'
import { Layout, UserInfo } from './../../components.js'

export default new Hono()
  .get('/profile', async (c) => { // Profile page
    const user = c.get('user');
    if (!user) return c.redirect('/login?error=no+session');

    return c.html(Layout({
      title: 'Profile',
      children: html`
        <h1>Profile</h1>
        ${UserInfo({ user })}
        
        <form method="post" action="/logout" style="display: inline;">
          <button type="submit">Logout</button>
        </form>
        <a href="/">Back to Home</a>
      `
    }));
  })