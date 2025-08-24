import { Hono } from 'hono'
import { html } from 'hono/html'
import { Layout } from '../components/layout.js'
import { Message } from '../components/common.js'
import { UserInfo, AddPasskeySection, PasskeyList } from '../components/profile.js'
import { auth } from '../../../auth.js'

export default new Hono()
  .get('/profile', async (c) => { // Profile page
    const user = c.get('user');
    if (!user) return c.redirect('/login?error=no+session');

    const error = c.req.query('error');
    const success = c.req.query('success');

    // Fetch user's passkeys
    let passkeys = [];
    try {
      passkeys = await auth.api.listPasskeys({
        headers: c.req.raw.headers,
      });
    } catch (error) {
      console.error('Failed to fetch passkeys:', error);
    }

    return c.html(Layout({
      title: 'Profile',
      children: html`
        <h1>Profile</h1>
        
        ${Message({ error, success })}
        
        ${UserInfo({ user })}
        
        ${PasskeyList({ passkeys })}
        
        ${AddPasskeySection({ user })}
        
        <div style="margin-top: 30px;">
          <form method="post" action="/logout" style="display: inline;">
            <button type="submit">Logout</button>
          </form>
          <a href="/" style="margin-left: 20px;">Back to Home</a>
        </div>
      `
    }));
  })
  .post('/profile/passkey/delete', async (c) => {
    const user = c.get('user');
    if (!user) return c.redirect('/login?error=no+session');

    const body = await c.req.parseBody();
    const { passkeyId } = body;

    try {
      await auth.api.deletePasskey({
        body: { id: passkeyId },
        headers: c.req.raw.headers,
      });
      return c.redirect('/profile?success=' + encodeURIComponent('Passkey deleted successfully'));
    } catch (error) {
      console.error('Delete passkey error:', error);
      return c.redirect('/profile?error=' + encodeURIComponent('Failed to delete passkey'));
    }
  })
