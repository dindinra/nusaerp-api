# NusaERP API Server

API Server untuk ekosistem NusaERP - menyediakan layanan AI chat, task queue management, dan integrasi dengan Mission Control Dashboard.

## Daftar Isi
- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Struktur Project](#struktur-project)
- [Installation](#installation)
- [Configuration](#configuration)
- [API Endpoints](#api-endpoints)
- [Task Queue System](#task-queue-system)
- [Agents Configuration](#agents-configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

NusaERP API Server adalah backend service yang menangani:
1. **AI Chat API** - Integrasi dengan OpenRouter untuk chat customer
2. **Task Queue System** - Manajemen task untuk multi-agent system (Mission Control)
3. **Data Storage** - Penyimpanan chat history dan activity logs (data.json)
4. **Agent Management** - Konfigurasi agent roles dan capabilities

**GitHub Repo:** https://github.com/dindinra/nusaerp-api  
**Live URL:** http://localhost:3000 (development)

---

## Tech Stack

- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **AI Provider:** OpenRouter API (tencent/hy3-preview:free)
- **Data Storage:** JSON files (data.json, agent_tasks.json, agents-config.json)
- **Dependencies:**
  - express
  - body-parser
  - cors
  - node-fetch
  - dotenv

---

## Struktur Project

```
nusaerp-api/
├── server.js              # Main server file
├── agents-config.json     # Agent roles & configurations
├── agent_tasks.json       # Task queue storage
├── data.json              # Chat history & activities
├── process_queue.sh       # Manual queue processor (deprecated)
├── .env                   # Environment variables (DON'T COMMIT)
├── .gitignore             # Git ignore rules
├── package.json           # Node.js dependencies
└── README.md              # This file
```

### File Explanations

| File | Purpose |
|------|---------|
| `server.js` | Main Express server, all API endpoints |
| `agents-config.json` | Defines agent roles, system prompts, capabilities |
| `agent_tasks.json` | Queue storage (PENDING, PROCESSING, COMPLETED, FAILED) |
| `data.json` | Chat messages, activity logs, customer data |
| `.env` | OPENROUTER_API_KEY, PORT, other secrets |

---

## Installation

### Prerequisites
- Node.js v18 atau lebih baru
- npm atau yarn
- OpenRouter API key (daftar di https://openrouter.ai)

### Steps

```bash
# Clone repository
git clone https://github.com/dindinra/nusaerp-api.git
cd nusaerp-api

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env
# Edit .env dan isi OPENROUTER_API_KEY
```

### Environment Variables (.env)

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
PORT=3000
```

**PENTING:** Jangan pernah commit file `.env` ke GitHub!

---

## Configuration

### OpenRouter API Key

API key disimpan di `.env` file:
```
OPENROUTER_API_KEY=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
```

Model yang digunakan: `tencent/hy3-preview:free` (reasoning model)

**Catatan Konfigurasi:**
1. **NO max_tokens** - Model reasoning tidak support parameter ini
2. **Force Indonesian** - System prompt: "ANDA HARUS MENJAWAB DALAM BAHASA INDONESIA"
3. **Timeout: 90 detik** - Reasoning model butuh waktu lebih lama

---

## API Endpoints

### Chat Endpoints

#### `POST /api/chat`
Mengirim pesan chat dan mendapatkan respons AI.

**Request Body:**
```json
{
  "message": "Apa itu Odoo 19?",
  "customerName": "Dindin"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Odoo 19 adalah...",
  "timestamp": "2026-04-27T10:30:00.000Z"
}
```

#### `GET /api/chat`
Mendapatkan riwayat chat.

**Response:**
```json
[
  {
    "id": 1,
    "sender": "customer",
    "message": "Halo",
    "time": "10:30"
  }
]
```

---

### Task Queue Endpoints (Mission Control)

#### `POST /api/agent-task`
Submit task baru ke queue (dipanggil oleh Mission Control Dashboard).

**Request Body:**
```json
{
  "agentId": "agent-1",
  "agentName": "Project Manager",
  "agentRole": "Project Manager",
  "task": "Buat timeline implementasi Odoo 19 untuk PT ABC"
}
```

**Response:**
```json
{
  "success": true,
  "taskId": 1714200000000,
  "message": "Task queued for processing by Abdul (PM)",
  "status": "PENDING"
}
```

#### `GET /api/agent-tasks`
Mendapatkan semua tasks dari queue (dipanggil oleh Abdul untuk processing).

**Response:**
```json
[
  {
    "id": 1714200000000,
    "agentId": "agent-1",
    "agentName": "Project Manager",
    "agentRole": "Project Manager",
    "task": "Buat timeline...",
    "status": "PENDING",
    "result": null,
    "createdAt": "2026-04-27T10:30:00.000Z",
    "completedAt": null
  }
]
```

#### `PATCH /api/agent-tasks/:taskId`
Update status/result task (dipanggil setelah Abdul selesai process).

**Request Body:**
```json
{
  "status": "COMPLETED",
  "result": "Timeline telah dibuat: ..."
}
```

**Response:**
```json
{
  "success": true,
  "task": { ... }
}
```

#### `GET /api/agent-tasks/completed`
Mendapatkan hanya task yang sudah COMPLETED.

#### `GET /api/agent-tasks/:taskId`
Mendapatkan detail satu task berdasarkan ID.

---

### Other Endpoints

#### `GET /api/activities`
Mendapatkan activity log (AI interactions, task submissions, dll).

#### `GET /api/health`
Health check endpoint.

---

## Task Queue System

### Architecture

```
Mission Control Dashboard (port 5173)
         |
         | POST /api/agent-task
         v
    NusaERP API (port 3000)
         |
         | Save to agent_tasks.json
         v
    Task Queue (PENDING)
         |
         | Abdul reads queue
         v
    Abdul (PM Agent) - Manual Processing
         |
         | PATCH /api/agent-tasks/:id
         v
    Task Status: COMPLETED + Result
         |
         | Mission Control polls every 3s
         v
    Display result in Dashboard
```

### Task Lifecycle

1. **PENDING** - Task baru masuk queue
2. **PROCESSING** - Abdul sedang mengerjakan
3. **COMPLETED** - Task selesai, result tersedia
4. **FAILED** - Task gagal diproses

### Manual Processing Flow

Task queue diproses **manual** oleh Abdul (PM Agent) ketika Dindin bilang:  
**"Abdul, process queue"**

Langkah-langkah:
1. Abdul baca queue: `GET /api/agent-tasks`
2. Filter task dengan status PENDING
3. Process task menggunakan `delegate_task` ke sub-agent yang sesuai
4. Update status: `PATCH /api/agent-tasks/:id` dengan status COMPLETED + result
5. Mission Control otomatis update via polling (3 detik)

**TIDAK ADA cron job** - ini save token OpenRouter!

---

## Agents Configuration

File: `agents-config.json`

```json
{
  "agents": [
    {
      "id": "agent-1",
      "name": "Project Manager",
      "role": "Project Manager",
      "icon": "📊",
      "color": "blue"
    },
    {
      "id": "agent-2",
      "name": "Developer",
      "role": "Developer",
      "icon": "💻",
      "color": "green"
    }
  ],
  "system_prompts": {
    "Project Manager": "Anda adalah AI Agent Project Manager...",
    "Developer": "Anda adalah AI Agent Developer..."
  }
}
```

### Default Agent Roles

| Role | Icon | Responsibility |
|------|------|----------------|
| Project Manager | 📊 | Timeline, koordinasi, monitoring |
| Documentation | 📝 | User manual, README, technical docs |
| Developer | 💻 | Code modification, Odoo modules |
| DevOps | ⚙️ | Deployment, Docker, VPS, SSL |
| Marketing | 📢 | Content, SEO, social media |
| Customer Service | 🎧 | Customer support, demo offers |

---

## Development

### Run Server (Development)

```bash
cd nusaerp-api
npm install
npm start
```

Server akan jalan di `http://localhost:3000`

### Run with Auto-reload

```bash
npm install -g nodemon
nodemon server.js
```

### Test API

```bash
# Test chat endpoint
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Halo", "customerName": "Test"}'

# Test task submission
curl -X POST http://localhost:3000/api/agent-task \
  -H "Content-Type: application/json" \
  -d '{"agentRole": "Developer", "task": "Test task"}'
```

---

## Deployment

### VPS Deployment (Recommended: Hostinger/DigitalOcean)

1. **Clone repo di VPS:**
```bash
cd /var/www
git clone https://github.com/dindinra/nusaerp-api.git
cd nusaerp-api
npm install --production
```

2. **Setup .env:**
```bash
cp .env.example .env
nano .env
# Isi OPENROUTER_API_KEY
```

3. **Run dengan PM2 (process manager):**
```bash
npm install -g pm2
pm2 start server.js --name nusaerp-api
pm2 save
pm2 startup
```

4. **Setup Nginx Reverse Proxy:**
```nginx
server {
    listen 80;
    server_name api.nusaerp.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

5. **SSL dengan Certbot:**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.nusaerp.com
```

---

## Troubleshooting

### Error: "OpenRouter API call failed"
- Cek API key di `.env` (valid dan tidak kedaluwarsa)
- Cek model name: `tencent/hy3-preview:free`
- Cek timeout: pastikan 90 detik (reasoning model)
- Jangan pakai `max_tokens` parameter

### Error: "Task queue not found"
- File `agent_tasks.json` akan otomatis dibuat jika tidak ada
- Cek permission folder: `chmod 755 nusaerp-api/`

### Error: "Port 3000 already in use"
```bash
# Cek process yang pakai port 3000
lsof -i:3000
# Kill process
kill -9 <PID>
```

### Mission Control tidak bisa connect
- Pastikan API server jalan di port 3000
- Cek CORS configuration di `server.js`
- Test manual: `curl http://localhost:3000/api/health`

---

## Future Improvements

- [ ] Database migration (from JSON to PostgreSQL/MongoDB)
- [ ] Authentication & Authorization (JWT)
- [ ] WebSocket untuk real-time updates (instead of polling)
- [ ] WhatsApp integration (whatsapp-web.js)
- [ ] Automated testing (Jest)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Docker containerization

---

## Kontak

**NusaERP Business Contact:**  
WhatsApp: +628****2778 (Dindin - Tim Marketing)  
Email: [your-email]

**Project Maintainer:**  
Dindin (https://github.com/dindinra)

---

## License

MIT License - see LICENSE file for details.

---

**Last Updated:** 27 April 2026  
**API Version:** 1.0.0  
**Status:** Active Development
