# Arqen — AI workspace

A lightweight browser interface for an Ollama-powered assistant.

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

## Storage note

Conversation history is currently stored in the browser using localStorage. It stays on the same browser/device and is not yet synchronized between devices. A Neon PostgreSQL database can provide cross-device persistence once a secure backend API and the Neon DATABASE_URL are configured.

## Run

Serve the repository as a static website, then configure the Ollama server URL in Settings. The browser must be able to reach the Ollama API.
