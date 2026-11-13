# Arqen — AI workspace

A lightweight browser interface for an Ollama-powered assistant, with a Node.js service prepared for Neon PostgreSQL.

## Current features

- Ollama model connection and model selector
- Streaming chat responses
- Multiple conversations saved in browser storage
- Conversation history drawer
- Rename, reopen, and delete conversations
- Automatic conversation titles based on the first user message
- Editable system instructions
- Copy assistant responses
- Mobile-friendly interface
- Node.js server with API and Neon database health endpoints

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies: `npm install`.
3. Copy `.env.example` to `.env` and set `DATABASE_URL` to the Neon connection string.
4. Start the server: `npm start`.
5. Open `http://localhost:3000`.

Check the service with `/api/health` and the database connection with `/api/health/database`.

## Build check

Run `npm run build`. This checks the server and browser JavaScript syntax; this project does not currently use a bundler.

## Neon CLI

Run the Neon CLI setup from the project root after signing in:

```sh
npm i -g neon@latest
neon init -y --org-id org-tiny-river-94844752 --project-id summer-shadow-08010073 --branch production --services postgres
neon deploy
```

If browser sign-in fails or times out, run `neon login` and retry. The CLI may create local Neon configuration and pull environment variables after authentication. Do not commit `.env` or any real connection string.

## Database schema

The initial schema is in `database/schema.sql`. It creates account-scoped conversation storage, but the current browser history remains in localStorage. Do not connect conversation CRUD endpoints until authentication is implemented and every request is checked against the signed-in user's identity.

## Important security notes

- The Neon connection string belongs only in the server environment as `DATABASE_URL`; never put it in `app.js`, HTML, or a public repository.
- The current chat history is still stored in the browser and is not synchronized across devices.
- The database health endpoint only runs `SELECT 1`; it does not expose database contents.
- Google sign-in and authenticated conversation synchronization are not implemented yet.
- The browser still connects directly to the configured Ollama endpoint, which must allow browser requests from the site's origin.
