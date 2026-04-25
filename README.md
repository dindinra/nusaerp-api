# NusaERP API Server
Express.js API server for the NusaERP ecosystem, handling lead management, customer chat, AI agent task processing, and activity logging.

## Tech Stack
- Node.js (v22+)
- Express.js
- CORS
- dotenv
- node-fetch (v2)
- OpenRouter API (tencent/hy3-preview:free model)

## Prerequisites
- Node.js installed
- OpenRouter API key (get from https://openrouter.ai)

## Environment Variables
Copy `.env.example` to `.env` and fill in the values:
```
OPENROUTER_API_KEY=your_openrouter_api_key_here
PORT=3000
DATA_FILE=./data.json
```

## Setup
1. Install dependencies:
   ```bash
   cd /home/dindin/nusaerp-api
   npm install
   ```
2. Create `.env` file from `.env.example`
3. Start the server:
   ```bash
   node server.js
   ```

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check |
| POST | `/api/leads` | Submit new lead from website |
| GET | `/api/leads` | Get all leads |
| POST | `/api/chat` | Submit chat message (processed by Agent 6 CS) |
| GET | `/api/activities` | Get all activities |
| POST | `/api/agent-task` | Submit task to specific AI agent (PM/Docs/Dev/DevOps/Mktg/CS) |
| GET | `/api/stats` | Get revenue/stats data |
| POST | `/api/customers` | Convert lead to customer |

## Integration Notes
- Website Marketing (`odoo19-marketing`) sends leads/chats to this API
- Mission Control Dashboard (`mission-control-dashboard`) fetches leads/activities/stats from this API
- All AI responses use OpenRouter's `tencent/hy3-preview:free` model with forced Indonesian language via system prompt
- Data is stored in `data.json` (excluded from git)

## Key Files
- `server.js`: Main API server code
- `data.json`: Persistent storage (excluded from git)
- `.env`: Environment variables (excluded from git)
- `.env.example`: Example environment variables (committed to git)

## Important Notes for AI Agents
1. Never commit `.env` or `data.json` to GitHub
2. The `tencent/hy3-preview:free` model is a reasoning model: do NOT set `max_tokens` in requests
3. All AI responses are forced to Indonesian via system prompt: `ANDA HARUS MENJAWAB DALAM BAHASA INDONESIA`
4. Agent roles for `/api/agent-task`:
   - 1: Project Manager (PM)
   - 2: Documentation (Docs)
   - 3: Developer (Dev)
   - 4: DevOps
   - 5: Marketing (Mktg)
   - 6: Customer Service (CS)
