/**
 * HTTP entry point, so the agent can be deployed as a service.
 *
 *   POST /ask   { "question": "...", "user": "support-t1@example.com" }
 *
 * The `user` field matters: ArmorIQ applies that person's policy, so the same
 * question can be allowed for a manager and held for a tier-1 agent.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { ask } from './ask.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT ?? 8080);

const app = express();
app.use(express.json());

// A minimal browser chat UI for manually testing the agent. Not part of the
// build-along guide — just a convenience for poking at a deployed agent.
// Served at "/" so it's the first thing you see when you open the URL.
app.use(express.static(path.join(__dirname, '../public')));

// Allows a browser-based frontend (a chat UI, a dashboard) to call this API
// directly. There's no session/cookie auth here to protect, so an open
// policy is fine for this demo; tighten it if you add real user auth.
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});
app.options('*', (_req, res) => res.sendStatus(204));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    agent: config.agentName,
    mcp: config.mcpName,
    armoriqDisabled: config.disableArmoriq,
  });
});

app.post('/ask', async (req, res) => {
  const question = req.body?.question;
  const user = req.body?.user;

  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'Body must include a "question" string.' });
  }
  if (typeof user !== 'string' || !user.includes('@')) {
    return res.status(400).json({ error: 'Body must include a "user" email address.' });
  }

  try {
    const result = await ask(question, user);
    res.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`/ask failed: ${message}`);
    res.status(500).json({ error: message });
  }
});

/**
 * Render's free plan spins a service down after 15 minutes with no inbound
 * traffic, and the next request hits a cold boot that can 502 at the edge
 * before the container finishes starting. Self-pinging on an interval
 * shorter than the idle timeout keeps this service from ever going to sleep.
 *
 * RENDER_EXTERNAL_URL is set automatically by Render on deployed services, so
 * this is a no-op for local runs.
 */
const externalUrl = process.env.RENDER_EXTERNAL_URL;
if (externalUrl) {
  const PING_INTERVAL_MS = 10 * 60 * 1000;
  setInterval(() => {
    fetch(`${externalUrl}/health`).catch(() => {});
  }, PING_INTERVAL_MS);
}

app.listen(PORT, () => {
  console.log(`ops-copilot agent listening on http://localhost:${PORT}`);
  console.log(`POST /ask  { "question": "...", "user": "you@example.com" }`);
});
