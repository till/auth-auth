# auth-auth

Small authentication/profile prototype for Codebar.

## Local Setup

Ensure to have `sqlite3` installed, then:

```sh
npm install
npm run setup
npm run dev
```

```sh
open http://localhost:3000
```

### Context

- data is saved in a sqlite database
- the app currently supports username/password and magic-link
- for magic-link, **inspect the log to fetch the URL**

## Demo

There's an additional application (mounted in this setup), that would demonstrate how to determine if a user is logged in.

```sh
open http://localhost:3000/demo
```
