import type { Hono } from "hono";

export function registerHealthRoute(app: Hono) {
  app.get("/health", (c) => c.json({ ok: true }));
}
