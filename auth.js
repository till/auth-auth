import { betterAuth } from "better-auth";
import { admin, magicLink } from "better-auth/plugins";
import { passkey } from "better-auth/plugins/passkey";
import Database from "better-sqlite3";
import appConfig from "./config.js";

const db = new Database(appConfig.database_url);

try {
  // https://litestream.io/tips/#busy-timeout
  db.pragma("busy_timeout = 5000");

  // https://litestream.io/tips/#synchronous-pragma
  db.pragma("synchronous = NORMAL");
} catch (e) {
  // this will trigger a hard error and end the process
  console.error(`error occurred: ${e.message}`);
  process.exit(-1);
}

export const auth = betterAuth({
  database: db,
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
