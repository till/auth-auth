import { betterAuth } from "better-auth";
import { admin, magicLink } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import Database from "better-sqlite3";
import appConfig from "./config.js";

export const auth = betterAuth({
  database: new Database("./auth.db"),
  baseURL: `http://${appConfig.host}:${appConfig.port}`,
  logger: {
    disabled: false,
    level: "debug",
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    github: {
      clientId: appConfig.social.github.id,
      clientSecret: appConfig.social.github.secret,
    },
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
      // eslint-disable-next-line no-unused-vars -- request is currently unused in this demo
      sendMagicLink: async ({ email, token, url }, request) => {
        console.log(`Magic Link for ${email}: ${url}`);
        console.log(`Token: ${token}`);
        console.log("---");
        // Return a resolved promise since we're just logging
        return Promise.resolve();
      },
    }),
    passkey(),
    admin({
      // adminUserIds: [],
    }),
  ],
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
