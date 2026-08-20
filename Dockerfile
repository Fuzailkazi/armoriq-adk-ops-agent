# Deploy to Cloud Run:
#   gcloud run deploy ops-copilot \
#     --source . --region us-central1 \
#     --set-env-vars ARMORIQ_API_KEY=...,GEMINI_API_KEY=...,MCP_URL=https://your-mcp.run.app/mcp
FROM node:22-slim

WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npx", "tsx", "src/server.ts"]
