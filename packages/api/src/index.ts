import { Hono } from "hono";

import { registerHealthRoute } from "./routes/health";

const app = new Hono();

registerHealthRoute(app);

const port = Number(process.env.PORT ?? 3001);

console.log(`Finny API listening on http://localhost:${port}`);

Bun.serve({
  port,
  fetch: app.fetch
});

export type App = typeof app;
