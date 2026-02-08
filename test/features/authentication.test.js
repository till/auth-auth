import { test } from "tap";
import { getTestInstance } from "../helpers/test-instance.js";
import { createApp } from "../../src/app/app.js";

test("authentication feature tests", async (t) => {
  t.test("user can sign up with email and password", async (t) => {
    const testInstance = await getTestInstance();
    const app = createApp(testInstance.auth);

    const formData = new URLSearchParams();
    formData.append("name", "New User");
    formData.append("email", "newuser@example.com");
    formData.append("password", "securepass123");

    const res = await app.request("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after signup");
    t.match(
      res.headers.get("location"),
      /\/profile/,
      "redirects to profile page",
    );
    t.ok(res.headers.get("set-cookie"), "sets session cookie");
  });

  t.test("signup can be done multiple times for different users", async (t) => {
    const testInstance = await getTestInstance();
    const app = createApp(testInstance.auth);

    const formData = new URLSearchParams();
    formData.append("name", "Another User");
    formData.append("email", "another@example.com");
    formData.append("password", "anotherpass123");

    const res = await app.request("/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: formData.toString(),
    });

    t.equal(res.status, 302, "redirects after signup");
    t.match(
      res.headers.get("location"),
      /\/profile/,
      "redirects to profile page",
    );
  });

  t.test("signup form is accessible", async (t) => {
    const testInstance = await getTestInstance();
    const app = createApp(testInstance.auth);

    const res = await app.request("/signup");

    t.equal(res.status, 200, "signup page loads");
    const html = await res.text();
    t.match(html, /Sign Up/i, "displays signup heading");
  });

  t.test("login form is accessible", async (t) => {
    const testInstance = await getTestInstance();
    const app = createApp(testInstance.auth);

    const res = await app.request("/login");

    t.equal(res.status, 200, "login page loads");
    const html = await res.text();
    t.match(html, /Sign In/i, "displays login heading");
  });

  t.test("user can logout", async (t) => {
    const testInstance = await getTestInstance();
    const app = createApp(testInstance.auth);
    const { client, getAuthHeaders } = testInstance;

    // Create and login user
    await client.signUp({
      email: "logout@example.com",
      password: "password123",
      name: "Logout User",
    });

    const headers = await getAuthHeaders("logout@example.com", "password123");

    // Verify user is logged in by accessing profile
    const profileBefore = await app.request("/profile", { headers });
    t.equal(profileBefore.status, 200, "user is logged in");

    // Logout
    const res = await app.request("/logout", {
      method: "POST",
      headers,
    });

    t.equal(res.status, 302, "redirects after logout");
    t.match(res.headers.get("location"), /\//, "redirects to home");

    // Verify session is invalidated
    const profileAfter = await app.request("/profile", { headers });
    t.equal(profileAfter.status, 302, "profile requires authentication");
    t.match(
      profileAfter.headers.get("location"),
      /\/login/,
      "redirects to login",
    );
  });
});
