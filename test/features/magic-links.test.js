import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createTestApp } from "../helpers/app.js";

test("magic links feature tests", async (t) => {
  t.test("user can request magic link", async (t) => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    const { client } = testInstance;

    await client.signUp({
      email: "magic@example.com",
      password: "password123",
      name: "Magic User",
    });

    const formData = new URLSearchParams();
    formData.append("email", "magic@example.com");

    const res = await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after requesting magic link");
    t.match(
      res.headers.get("location"),
      /success/,
      "redirects with success message",
    );
  });

  t.test("magic link request for nonexistent user succeeds", async (t) => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);

    const formData = new URLSearchParams();
    formData.append("email", "nonexistent@example.com");

    const res = await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    // Should still show success to prevent email enumeration
    t.equal(res.status, 302, "redirects after requesting magic link");
    t.match(
      res.headers.get("location"),
      /success/,
      "shows success message even for nonexistent user",
    );
  });

  t.test("magic link GET page renders form", async (t) => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);

    const res = await app.request("/login/magic-link");

    t.equal(res.status, 200, "magic link page loads");
    const html = await res.text();
    t.match(html, /Magic Link/i, "displays magic link heading");
    t.match(html, /email/i, "has email input");
  });

  t.test("magic link URL is captured in test", async (t) => {
    const testInstance = await getTestInstance();
    const app = createTestApp(testInstance.auth);
    const { client, getMagicLinks } = testInstance;

    await client.signUp({
      email: "magic-url@example.com",
      password: "password123",
      name: "Magic URL User",
    });

    const formData = new URLSearchParams();
    formData.append("email", "magic-url@example.com");

    await app.request("/login/magic-link", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    const magicLinks = getMagicLinks();
    t.ok(magicLinks.length > 0, "magic link was generated");
    t.equal(
      magicLinks[0].email,
      "magic-url@example.com",
      "magic link for correct email",
    );
    t.ok(magicLinks[0].url, "magic link has URL");
    t.ok(magicLinks[0].token, "magic link has token");
  });
});
