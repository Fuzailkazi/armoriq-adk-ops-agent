/**
 * HTTP entry point, so the agent can be deployed as a service.
 *
 *   POST /ask   { "question": "...", "user": "support-t1@example.com" }
 *
 * The `user` field matters: ArmorIQ applies that person's policy, so the same
 * question can be allowed for a manager and held for a tier-1 agent.
 */
import express from 'express';
import { ask } from './ask.js';
import { config } from './config.js';

const PORT = Number(process.env.PORT ?? 8080);

const app = express();
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agent: config.agentName, mcp: config.mcpName });
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

app.listen(PORT, () => {
  console.log(`ops-copilot agent listening on http://localhost:${PORT}`);
  console.log(`POST /ask  { "question": "...", "user": "you@example.com" }`);
});
