import express from "express";
import { neon } from "@neondatabase/serverless";
import { OAuth2Client } from "google-auth-library";
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 3000);
const root = path.dirname(fileURLToPath(import.meta.url));
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const sessionSecret = process.env.SESSION_SECRET;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;
const googleOAuth = googleClientId && googleClientSecret
  ? new OAuth2Client(googleClientId, googleClientSecret, redirectUri)
  : null;

app.disable("x-powered-by");
app.use(express.json({ limit: "32kb" }));

function parseCookies(request) {
  return Object.fromEntries((request.headers.cookie || "").split(";").filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [part.slice(0, index).trim(), decodeURIComponent(part.slice(index + 1).trim())];
  }));
}

function sign(value) {
  return createHmac("sha256", sessionSecret).update(value).digest("base64url");
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a));
  const right = Buffer.from(String(b));
  return left.length === right.length && timingSafeEqual(left, right);
}

function signedValue(value) {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSignedValue(value) {
  if (!value || !sessionSecret) return null;
  const [payload, signature] = value.split(".");
  if (!payload || !signature || !safeEqual(signature, sign(payload))) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (parsed.exp && parsed.exp < Date.now()) return null;
    return parsed;
  } catch {
    return null;
  }
}

function setCookie(response, name, value, maxAge) {
  response.append("Set-Cookie", `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`);
}

function clearCookie(response, name) {
  response.append("Set-Cookie", `${name}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
}

function authConfigurationReady() {
  return Boolean(googleOAuth && redirectUri && sessionSecret && sessionSecret.length >= 32);
}

app.get("/api/health", (_request, response) => {
  response.json({ ok: true, service: "arqen-api", googleAuthConfigured: authConfigurationReady() });
});

app.get("/api/health/database", async (_request, response) => {
  if (!process.env.DATABASE_URL) {
    return response.status(503).json({ ok: false, service: "neon-postgres", error: "DATABASE_URL is not configured" });
  }
  try {
    const sql = neon(process.env.DATABASE_URL);
    await sql`SELECT 1`;
    return response.json({ ok: true, service: "neon-postgres" });
  } catch (error) {
    console.error("Neon health check failed:", error);
    return response.status(503).json({ ok: false, service: "neon-postgres", error: "Database connection failed" });
  }
});

app.get("/auth/google", (request, response) => {
  if (!authConfigurationReady()) {
    return response.status(503).send("Google sign-in is not configured on this Arqen server yet.");
  }
  const state = randomBytes(32).toString("base64url");
  setCookie(response, "arqen_oauth_state", signedValue({ state, exp: Date.now() + 10 * 60 * 1000 }), 600);
  const url = googleOAuth.generateAuthUrl({
    access_type: "online",
    prompt: "select_account",
    scope: ["openid", "email", "profile"],
    state
  });
  response.redirect(url);
});

app.get("/auth/google/callback", async (request, response) => {
  if (!authConfigurationReady()) return response.status(503).send("Google sign-in is not configured.");
  const cookies = parseCookies(request);
  const savedState = readSignedValue(cookies.arqen_oauth_state);
  clearCookie(response, "arqen_oauth_state");

  if (request.query.error || !request.query.code || !savedState || !safeEqual(request.query.state || "", savedState.state)) {
    return response.status(400).send("Google sign-in was cancelled or could not be verified. Please try again.");
  }

  try {
    const { tokens } = await googleOAuth.getToken(String(request.query.code));
    if (!tokens.id_token) throw new Error("Google did not return an identity token.");
    const ticket = await googleOAuth.verifyIdToken({ idToken: tokens.id_token, audience: googleClientId });
    const profile = ticket.getPayload();
    if (!profile?.sub || !profile.email || !profile.email_verified) {
      throw new Error("Google account email is missing or not verified.");
    }

    const session = {
      sub: profile.sub,
      email: profile.email,
      name: profile.name || profile.email,
      picture: profile.picture || null,
      exp: Date.now() + 7 * 24 * 60 * 60 * 1000
    };
    setCookie(response, "arqen_session", signedValue(session), 7 * 24 * 60 * 60);
    response.redirect("/");
  } catch (error) {
    console.error("Google OAuth callback failed:", error);
    response.status(401).send("Unable to sign in with Google. Please try again.");
  }
});

app.get("/api/me", (request, response) => {
  const session = readSignedValue(parseCookies(request).arqen_session);
  if (!session) return response.status(401).json({ authenticated: false });
  response.set("Cache-Control", "no-store");
  response.json({
    authenticated: true,
    user: { id: session.sub, email: session.email, name: session.name, picture: session.picture }
  });
});

app.post("/auth/logout", (_request, response) => {
  clearCookie(response, "arqen_session");
  response.json({ ok: true });
});

app.get("/", (_request, response) => response.sendFile(path.join(root, "index.html")));
app.get("/app.js", (_request, response) => response.type("application/javascript").sendFile(path.join(root, "app.js")));
app.get("/docs.html", (_request, response) => response.sendFile(path.join(root, "docs.html")));

app.listen(port, "0.0.0.0", () => {
  console.log(`Arqen server listening on port ${port}`);
});
