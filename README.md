# auth-auth

Small authentication/profile prototype for Codebar.

## Local Setup

For a new run the following:

```sh
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

To update your local copy:

```sh
npm ci
npm run db:migrate
npm run dev
```

View the application:

```sh
open http://localhost:3000
```

### Context

- data is saved in a sqlite database
- the app currently supports username/password, magic-link and (sign-in with) passkey
- for magic-link, **inspect the log to fetch the URL**

## What's happening here?

Once the application is running, you can try out the the following flows:

- sign-up
- sign-in (username/password, passkey)
- add passkey

In addition `/admin` hosts a very basic admin ui (list user, update roles).

## Demo

There's an additional application (mounted in this setup), that would demonstrate how to determine if a user is logged in.

```sh
open http://localhost:3000/demo
```
