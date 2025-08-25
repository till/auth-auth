import { createAuthClient } from "better-auth/client";
import { passkeyClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: "http://localhost:3000",
  plugins: [passkeyClient()],
});

export const { passkey, signIn, signUp } = authClient;
