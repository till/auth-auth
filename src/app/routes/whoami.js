import { Hono } from "hono";

export default new Hono().get("/whoami", async (c) => {
  const user = c.get("user");
  if (!user) {
    c.status(401);
    return c.json({ role: "guest" });
  }

  // return the bare minimum (needs to be defined)
  return c.json({
    role: "user",
    data: {
      name: user.name,
      id: user.id,
    },
  });
});
