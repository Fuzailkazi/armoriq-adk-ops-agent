/**
 * Check your setup before running the agent.
 *
 *   npm run check
 *
 * This only reads. It does not create plans, tokens, or approval requests, so
 * it is safe to run against a real account.
 *
 * It answers the question that causes most first-time confusion: do the names
 * in your .env actually match what is registered on platform.armoriq.ai?
 */
import { ArmorIQClient } from '@armoriq/sdk';
import { config } from './config.js';

async function main() {
  console.log('Checking your setup...\n');

  // ── 1. Can we reach the MCP server? ──────────────────────────────────────
  try {
    const response = await fetch(config.mcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} }),
    });
    const text = await response.text();
    const match = text.match(/\{[\s\S]*\}/);
    const tools = match ? JSON.parse(match[0]).result?.tools ?? [] : [];
    console.log(`MCP server:  OK — ${tools.length} tools at ${config.mcpUrl}`);
    for (const tool of tools) console.log(`               ${tool.name}`);
  } catch (error: unknown) {
    console.log(`MCP server:  FAILED — cannot reach ${config.mcpUrl}`);
    console.log(`               ${error instanceof Error ? error.message : String(error)}`);
    console.log('               Is the mcp-server running? cd ../mcp-server && npm start');
  }
  console.log();

  // ── 2. Is the ArmorIQ key valid, and do the names match? ─────────────────
  const client = new ArmorIQClient({
    apiKey: config.armoriqApiKey,
    userId: 'agent',
    agentId: config.agentName,
    useProduction: true,
  });

  try {
    const account = await client.bootstrap();

    const agentNames: string[] = (account.agents ?? []).map((a: { name?: string }) => a.name ?? '?');
    const mcpNames: string[] = (account.mcps ?? []).map((m: { name?: string }) => m.name ?? '?');

    console.log(`ArmorIQ:     OK — org "${account.org?.name ?? 'unknown'}"`);
    console.log(`Agents:      ${agentNames.length ? agentNames.join(', ') : 'none registered'}`);
    console.log(`MCPs:        ${mcpNames.length ? mcpNames.join(', ') : 'none registered'}`);
    console.log();

    // The two mismatches that cause "my policies aren't firing".
    console.log(
      agentNames.includes(config.agentName)
        ? `Agent name:  OK — "${config.agentName}" is registered`
        : `Agent name:  MISMATCH — .env says "${config.agentName}", which is not registered.\n` +
          `               Register it, or change ARMORIQ_AGENT_NAME to one of the above.`,
    );
    console.log(
      mcpNames.includes(config.mcpName)
        ? `MCP name:    OK — "${config.mcpName}" is registered`
        : `MCP name:    MISMATCH — .env says "${config.mcpName}", which is not registered.\n` +
          `               Register it, or change ARMORIQ_MCP_NAME to one of the above.`,
    );
  } catch (error: unknown) {
    console.log(`ArmorIQ:     FAILED — ${error instanceof Error ? error.message : String(error)}`);
    console.log('               Check ARMORIQ_API_KEY in .env.');
  }

  console.log();
  client.close();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
