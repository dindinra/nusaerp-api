require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Middleware
app.use(cors())
app.use(bodyParser.json())

// Initialize data file if not exists
if (!fs.existsSync(DATA_FILE)) {
  const initialData = {
    leads: [],
    customers: [],
    activities: [],
    stats: {
      totalRevenue: 0,
      thisMonthRevenue: 0,
      totalCustomers: 0,
      totalDeployments: 0
    }
  }
  fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2))
}

// Helper to read data
function readData() {
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'))
}

// Helper to write data
function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2))
}

// API Routes

// Get all leads
app.get('/api/leads', (req, res) => {
  const data = readData()
  res.json(data.leads)
})

// Submit new lead (from marketing site)
app.post('/api/leads', (req, res) => {
  const data = readData()
  const newLead = {
    id: Date.now(),
    name: req.body.name,
    email: req.body.email,
    phone: req.body.phone,
    message: req.body.message,
    status: 'Lead',
    package: '-',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  }
  data.leads.push(newLead)
  writeData(data)
  
  // Add to activities
  const activity = {
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    message: `New lead: ${newLead.name} (Rp 1.5M potential)`,
    type: 'lead'
  }
  data.activities.unshift(activity)
  if (data.activities.length > 50) data.activities.pop()
  writeData(data)
  
  res.json({ success: true, lead: newLead })
})

// Get all customers
app.get('/api/customers', (req, res) => {
  const data = readData()
  res.json(data.customers)
})

// Add new customer (when lead converts)
app.post('/api/customers', (req, res) => {
  const data = readData()
  const newCustomer = req.body
  newCustomer.id = Date.now()
  newCustomer.date = new Date().toISOString().split('T')[0]
  data.customers.push(newCustomer)
  data.stats.totalCustomers++
  
  if (newCustomer.status === 'Deployed') {
    data.stats.totalDeployments++
    data.stats.totalRevenue += 1500000 // Rp 1.5M
    data.stats.thisMonthRevenue += 1500000
  }
  writeData(data)
  
  // Add activity
  const activity = {
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    message: `Customer: ${newCustomer.name} - ${newCustomer.status}`,
    type: newCustomer.status === 'Deployed' ? 'deploy' : 'lead'
  }
  data.activities.unshift(activity)
  if (data.activities.length > 50) data.activities.pop()
  writeData(data)
  
  res.json({ success: true, customer: newCustomer })
})

// Update customer status
app.patch('/api/customers/:id', (req, res) => {
  const data = readData()
  const customerId = parseInt(req.params.id)
  const customer = data.customers.find(c => c.id === customerId)
  
  if (customer) {
    Object.assign(customer, req.body)
    writeData(data)
    res.json({ success: true, customer })
  } else {
    res.status(404).json({ success: false, message: 'Customer not found' })
  }
})

// Get stats
app.get('/api/stats', (req, res) => {
  const data = readData()
  res.json(data.stats)
})

// Get activities
app.get('/api/activities', (req, res) => {
  const data = readData()
  res.json(data.activities)
})

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() })
})

// Serve static info page
app.get('/', (req, res) => {
  res.send(`
    <h1>NusaERP API Server</h1>
    <p>API running on port ${PORT}</p>
    <ul>
      <li><a href="/api/leads">/api/leads</a> - GET/POST leads</li>
      <li><a href="/api/customers">/api/customers</a> - GET/POST customers</li>
      <li><a href="/api/stats">/api/stats</a> - GET stats</li>
      <li><a href="/api/activities">/api/activities</a> - GET activities</li>
      <li>/api/health - Health check</li>
    </ul>
  `)
})

// Start server
app.listen(PORT, () => {
  console.log(`NusaERP API Server running on http://localhost:${PORT}`)
})

// Chat messages store
let chatMessages = [];

// OpenRouter API config
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';
const AI_MODEL = 'tencent/hy3-preview:free';

// Function to call OpenRouter API with timeout
async function callOpenRouter(userMessage, customerName) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout
  
  try {
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5174',
        'X-Title': 'NusaERP Chat'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `ANDA HARUS MENJAWAB DALAM BAHASA INDONESIA. JANGAN GUNAKAN BAHASA LAIN.
            
Anda adalah Customer Service AI untuk NusaERP, perusahaan jasa instalasi Odoo 19 ERP. 
Jawab dengan ramah dan profesional dalam Bahasa Indonesia.
            
Info penting:
- Harga paket: Rp 1.500.000 (promo dari Rp 1.750.000)
- Fitur: Odoo 19 lengkap (Accounting, Sales, Inventory, Manufacturing, POS), MATE Accounting, 15+ modul OCA, Hosting VPS Gratis Selamanya, Domain + SSL, Manual Bahasa Indonesia
- Training opsional: Rp 500.000/hari
- Kontak: WhatsApp +628****2778 (Dindin - Tim Marketing)
- Demo gratis tersedia via laptop
- Dikelola 100% oleh AI Agents

Jika ada yang tanya harga, sebutkan Rp 1,5 Juta. Jika tanya demo, tawarkan demo gratis.`
          },
          {
            role: 'user',
            content: userMessage
          }
        ],
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter full response:', JSON.stringify(data));
    console.log('Choices:', JSON.stringify(data.choices));
    console.log('First choice:', JSON.stringify(data.choices[0]));
    console.log('Message:', JSON.stringify(data.choices[0]?.message));
    console.log('Content:', data.choices[0]?.message?.content);
    
    // Extract content properly
    if (data.choices && data.choices[0] && data.choices[0].message) {
      return data.choices[0].message.content;
    } else {
      console.error('Unexpected API response structure:', data);
      throw new Error('Invalid API response');
    }
  } catch (error) {
    console.error('Error calling OpenRouter:', error.message);
    return `Maaf, sedang ada gangguan sistem. Silakan hubungi WhatsApp +628****2778 (Dindin) untuk bantuan langsung.`;
  }
}

// Submit chat message (from website)
app.post('/api/chat', async (req, res) => {
  const { message, customerName } = req.body;
  
  const newMessage = {
    id: Date.now(),
    from: customerName || 'Website Visitor',
    message,
    timestamp: new Date().toISOString(),
    type: 'chat'
  };
  chatMessages.push(newMessage);
  
  // Add to activities
  const data = readData();
  const activity = {
    time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    message: `Chat: ${customerName || 'Visitor'}: ${message}`,
    type: 'cs'
  };
  data.activities.unshift(activity);
  if (data.activities.length > 50) data.activities.pop();
  writeData(data);
  
  try {
    // Call OpenRouter AI for real response
    const aiText = await callOpenRouter(message, customerName);
    
    const aiResponse = {
      id: Date.now() + 1,
      from: 'Agent 6 (CS)',
      message: aiText,
      timestamp: new Date().toISOString(),
      type: 'chat'
    };
    chatMessages.push(aiResponse);
    
    res.json({ success: true, message: newMessage, response: aiResponse });
  } catch (error) {
    console.error('Chat error:', error);
    const fallbackResponse = {
      id: Date.now() + 1,
      from: 'Agent 6 (CS)',
      message: `Maaf, sedang ada gangguan. Hubungi +628****2778 (Dindin) untuk bantuan.`,
      timestamp: new Date().toISOString(),
      type: 'chat'
    };
    chatMessages.push(fallbackResponse);
    res.json({ success: true, message: newMessage, response: fallbackResponse });
  }
});

// Get chat messages (for Mission Control maybe)
app.get('/api/chat', (req, res) => {
  res.json(chatMessages);
});

// Agent Task Processing with OpenRouter AI
app.post('/api/agent-task', async (req, res) => {
  const { agentId, agentRole, agentName, task } = req.body;
  
  if (!task || !agentRole) {
    return res.status(400).json({ success: false, message: 'Missing task or agentRole' });
  }

  // System prompts based on agent role
  const rolePrompts = {
    'Project Manager': `Anda adalah AI Agent Project Manager (PM) untuk NusaERP.
Tugas Anda: Mengelola timeline project instalasi Odoo 19, koordinasi antar agen, monitor progress customer.
Jawab dalam Bahasa Indonesia yang profesional dan terstruktur.
Gunakan format: Status | Progress | Next Steps`,
    
    'Documentation': `Anda adalah AI Agent Documentation Specialist untuk NusaERP.
Tugas Anda: Membuat user manual Bahasa Indonesia, dokumentasi teknis, README, dan panduan penggunaan Odoo 19.
Jawab dalam Bahasa Indonesia yang mudah dipahami.
Gunakan format yang rapi dengan heading, bullet points, dan penomoran.`,
    
    'Developer': `Anda adalah AI Agent Developer untuk NusaERP.
Tugas Anda: Modifikasi kode Odoo 19, install modul OCA, setup MATE Accounting, troubleshooting teknis.
Jawab dalam Bahasa Indonesia teknis tapi jelas.
Sertakan kode/shell command jika diperlukan.`,
    
    'DevOps': `Anda adalah AI Agent DevOps untuk NusaERP.
Tugas Anda: Deploy Odoo 19 ke VPS (DigitalOcean/Hostinger), setup Docker, konfigurasi domain, SSL, monitoring.
Jawab dalam Bahasa Indonesia teknis.
Sertakan perintah terminal/CLI jika diperlukan.`,
    
    'Marketing': `Anda adalah AI Agent Marketing untuk NusaERP.
Tugas Anda: Buat konten sosmed, update website, SEO, analisis kompetitor, email marketing.
Jawab dalam Bahasa Indonesia yang menarik dan persuasif.
Gunakan emoji yang tepat dan call-to-action yang jelas.`,
    
    'Customer Service': `Anda adalah AI Agent Customer Service untuk NusaERP.
Tugas Anda: Jawab pertanyaan customer, handle keluhan, berikan info paket Rp 1.5M, tawarkan demo gratis.
Jawab dalam Bahasa Indonesia yang ramah dan solutif.
Selalu sebutkan: "Hubungi +628****2778 (Dindin) jika butuh bantuan lebih lanjut."`
  };

  const systemPrompt = rolePrompts[agentRole] || rolePrompts['Customer Service'];
  
  try {
    console.log(`Agent Task - ${agentName} (${agentRole}): ${task}`);
    
    const response = await fetch(OPENROUTER_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'NusaERP Mission Control'
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          {
            role: 'system',
            content: `ANDA HARUS MENJAWAB DALAM BAHASA INDONESIA. JANGAN GUNAKAN BAHASA LAIN.\n\n${systemPrompt}`
          },
          {
            role: 'user',
            content: task
          }
        ],
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`API call failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('Agent task response received');
    
    let aiResponse = '';
    if (data.choices && data.choices[0] && data.choices[0].message) {
      aiResponse = data.choices[0].message.content;
    } else {
      throw new Error('Invalid API response structure');
    }

    // Log activity
    const data_store = readData();
    const activity = {
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      message: `AI Task: ${agentName} - ${task.substring(0, 50)}...`,
      type: 'ai'
    };
    data_store.activities.unshift(activity);
    if (data_store.activities.length > 50) data_store.activities.pop();
    writeData(data_store);

    res.json({
      success: true,
      agentId,
      agentName,
      agentRole,
      task,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Agent task error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Gagal memproses task dengan AI',
      error: error.message
    });
  }
});
