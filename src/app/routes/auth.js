
import { Hono } from 'hono'
import { html } from 'hono/html'
import { Layout, Navigation, Message, FormSection } from './../../components.js'
import { auth } from '../../../auth.js'

// Helper function to forward Set-Cookie headers from better-auth response
const forwardCookies = (response, c) => {
  const setCookieHeaders = response.headers.getSetCookie?.() || [];
  setCookieHeaders.forEach(cookie => {
    c.header('Set-Cookie', cookie);
  });
}

export default new Hono()
  .get('/login', (c) => { // Login page
    const error = c.req.query('error');
    const success = c.req.query('success');
    
    return c.html(Layout({
      title: 'Sign In',
      children: html`
        <h1>Sign In</h1>
        ${Navigation({ 
          back: { href: '/', text: 'Back to Home' },
          extra: { href: '/signup', text: "Don't have an account? Sign Up" }
        })}
        
        ${Message({ error, success })}

        ${FormSection({ 
          children: html`
            <form method="post" action="/signin">
              <div class="form-group">
                <input type="email" name="email" placeholder="Email" required />
              </div>
              <div class="form-group">
                <input type="password" name="password" placeholder="Password" required />
              </div>
              <button type="submit">Sign In</button>
            </form>
          `
        })}
      `
    }))
  })
  .get('/signup', (c) => {
    const error = c.req.query('error');
    const success = c.req.query('success');
    
    return c.html(Layout({
      title: 'Sign Up',
      children: html`
        <h1>Sign Up</h1>
        ${Navigation({ 
          back: { href: '/', text: 'Back to Home' },
          extra: { href: '/login', text: 'Already have an account? Sign In' }
        })}
        
        ${Message({ error, success })}

        ${FormSection({ 
          children: html`
            <form method="post" action="/signup">
              <div class="form-group">
                <input type="text" name="name" placeholder="Full Name" required />
              </div>
              <div class="form-group">
                <input type="email" name="email" placeholder="Email" required />
              </div>
              <div class="form-group">
                <input type="password" name="password" placeholder="Password" required />
              </div>
              <button type="submit">Create Account</button>
            </form>
          `
        })}
      `
    }))
  })
  .post('/signup', async (c) => { // Sign up form handler
    const body = await c.req.parseBody();
    const { name, email, password } = body;

    try {
      const result = await auth.api.signUpEmail({
        body: {
          name,
          email,
          password
        },
      });

      if (result.error) {
        return c.redirect('/login?error=' + encodeURIComponent(result.error.message || 'Sign up failed'));
      }

      return c.redirect('/login?success=' + encodeURIComponent('Account created! You can now sign in.'));
    } catch (error) {
      return c.redirect('/login?error=' + encodeURIComponent('Network error'));
    }
  })
  .post('/signin', async (c) => { // Sign in form handler
    const body = await c.req.parseBody();
    const { email, password } = body;

    try {
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
          rememberMe: true,
        },
        headers: c.req.raw.headers,
        asResponse: true
      });
      
      if (!result.ok) {
        const error = await result.json();
        return c.redirect('/login?error=' + encodeURIComponent(error.message || 'Sign in failed'));
      }

      // Forward the cookies from better-auth
      forwardCookies(result, c);
      
      return c.redirect('/profile?success=welcome+back');
    } catch (error) {
      return c.redirect('/login?error=' + encodeURIComponent('Network error'));
    }
  })
  .post('/logout', async (c) => { // Logout handler
    try {
      const result = await auth.api.signOut({
        headers: c.req.raw.headers,
        asResponse: true
      });

      if (result.ok) {
        // Forward the cookies to clear the session
        forwardCookies(result, c);
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    return c.redirect('/');
  })