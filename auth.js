import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';
import { passkey } from 'better-auth/plugins/passkey';
import Database from 'better-sqlite3';

export const auth = betterAuth({
  database: new Database('./auth.db'),
  baseURL: 'http://localhost:3000',
  logger: {
		disabled: false,
		level: 'debug',
  },
  emailAndPassword: {
    enabled: true,
  },
  telemetry: {
    enabled: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day (update session every day)
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, token, url }, request) => {
        console.log(`Magic Link for ${email}: ${url}`);
        console.log('---');
        // Return a resolved promise since we're just logging
        return Promise.resolve();
      }
    }),
    passkey(),
  ]
  // advanced: {
  //   crossSubDomainCookies: {
  //     enabled: true,
  //     domain: '.codebar.io',
  //   },
  // },
  // trustedOrigins: [
  //   'https://codebar.io',
  //   'https://stats.codebar.io',
  //   'https://calendar.codebar.io',
  //   'https://jobs.codebar.io'
  // ],
});
