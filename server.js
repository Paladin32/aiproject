import express from "express";
import { neon } from "@neondatabase/serverless";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "arqen-api" });
});

app.get("/api/health/database", async (_request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({
      ok: false,
      service: "neon-postgres",
      error: "DATABASE_URL is not configured"
    });
  }

  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;
    return response.json({ ok: true, service: "neon-postgres" });
  } catch (error) {
    console.error("Neon health check failed:", error);
    return response.status(503).json({
      ok: false,
      service: "neon-postgres",
      error: "Database connection failed"
    });
  }
});

app.get("/", (_request, response) => {
  response.sendFile(path.join(root, "index.html"));
});
app.get("/app.js", (_request, response) => {
  response.type("application/javascript").sendFile(path.join(root, "app.js"));
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Arqen server listening on port ${port}`);
});
