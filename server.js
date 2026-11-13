import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { WhatsAppManager } from './whatsapp.js';

import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
});

// Serve dist (built shadcn/ui React app) if exists, and public assets
const distPath = path.join(__dirname, 'dist');
const publicPath = path.join(__dirname, 'public');

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
}
app.use(express.static(publicPath));

// Initialize WhatsApp Manager
const wa = new WhatsAppManager(io);

// Socket.io connection
io.on('connection', (socket) => {
  // Send initial status to freshly connected client
  socket.emit('status', {
    status: wa.status,
    user: wa.user,
    qr: wa.qrCodeDataUrl
  });

  socket.on('request-status', () => {
    socket.emit('status', {
      status: wa.status,
      user: wa.user,
      qr: wa.qrCodeDataUrl
    });
  });
});

// API Routes

// 1. Connection & Status
app.get('/api/status', (req, res) => {
  res.json({
    success: true,
    status: wa.status,
    user: wa.user,
    qr: wa.qrCodeDataUrl
  });
});

app.post('/api/connect', async (req, res) => {
  try {
    if (wa.status === 'connected') {
      return res.json({ success: true, message: 'متصل بالفعل', user: wa.user });
    }
    await wa.init();
    res.json({ success: true, message: 'تم بدء الاتصال' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/logout', async (req, res) => {
  try {
    await wa.logout();
    res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Groups List & Details
app.get('/api/groups', async (req, res) => {
  try {
    const groups = await wa.getAllGroups();
    res.json({ success: true, count: groups.length, groups });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/groups/:jid', async (req, res) => {
  try {
    const group = await wa.getGroupDetails(req.params.jid);
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Members Management: Add, Remove, Promote, Demote
app.post('/api/groups/:jid/participants', async (req, res) => {
  try {
    const { jid } = req.params;
    const { participants, action } = req.body;

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تقديم قائمة بأرقام المشاركين' });
    }

    if (!['add', 'remove', 'promote', 'demote'].includes(action)) {
      return res.status(400).json({ success: false, error: 'نوع الإجراء غير صالح (add, remove, promote, demote)' });
    }

    const result = await wa.updateParticipants(jid, participants, action);
    res.json({ success: true, action, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Group Settings (Announce / Lock)
app.post('/api/groups/:jid/setting', async (req, res) => {
  try {
    const { jid } = req.params;
    const { type, value } = req.body; // type: 'announce' | 'lock', value: boolean

    if (type === 'announce') {
      const result = await wa.toggleGroupAnnounce(jid, Boolean(value));
      return res.json({ success: true, result });
    } else if (type === 'lock') {
      const result = await wa.toggleGroupLocked(jid, Boolean(value));
      return res.json({ success: true, result });
    } else {
      return res.status(400).json({ success: false, error: 'نوع الإعداد غير مدعوم' });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Update Subject & Description
app.post('/api/groups/:jid/subject', async (req, res) => {
  try {
    const { jid } = req.params;
    const { subject } = req.body;
    if (!subject) return res.status(400).json({ success: false, error: 'يرجى إدخال اسم المجموعة الجديد' });
    const result = await wa.updateGroupSubject(jid, subject);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/groups/:jid/description', async (req, res) => {
  try {
    const { jid } = req.params;
    const { description } = req.body;
    const result = await wa.updateGroupDescription(jid, description || '');
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Invite Code & Revoke
app.get('/api/groups/:jid/invite', async (req, res) => {
  try {
    const { jid } = req.params;
    const invite = await wa.getInviteCode(jid);
    res.json({ success: true, ...invite });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/groups/:jid/revoke-invite', async (req, res) => {
  try {
    const { jid } = req.params;
    const invite = await wa.revokeInviteCode(jid);
    res.json({ success: true, ...invite });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Send Message to Group
app.post('/api/groups/:jid/send', async (req, res) => {
  try {
    const { jid } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ success: false, error: 'يرجى كتابة نص الرسالة' });
    const result = await wa.sendMessage(jid, message);
    res.json({ success: true, result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Export Members as CSV
app.get('/api/groups/:jid/export-csv', async (req, res) => {
  try {
    const { jid } = req.params;
    const group = await wa.getGroupDetails(jid);

    // Build CSV with BOM for correct Arabic rendering in Excel
    let csv = '\uFEFFرقم الهاتف,الاسم,الرتبة,المعرف (JID)\n';
    group.participants.forEach((p) => {
      let role = 'عضو';
      if (p.isSuperAdmin) role = 'مالك المجموعة';
      else if (p.isAdmin) role = 'مشرف';

      const cleanName = (p.name || '').replace(/"/g, '""');
      const cleanPhone = `+${p.phone}`;

      csv += `"${cleanPhone}","${cleanName}","${role}","${p.id}"\n`;
    });

    const safeName = (group.subject || 'group').replace(/[^a-zA-Z0-9\u0600-\u06FF_-]/g, '_');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="members_${safeName}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. All Members with Group Tags (Unified Directory)
app.get('/api/members', async (req, res) => {
  try {
    const members = await wa.getAllParticipantsWithGroupTags();
    res.json({ success: true, count: members.length, members });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/members/export-csv', async (req, res) => {
  try {
    const members = await wa.getAllParticipantsWithGroupTags();
    let csv = '\uFEFFرقم الهاتف,الاسم,المجموعات (Tags),المعرف (JID)\n';
    members.forEach((m) => {
      const cleanName = (m.name || '').replace(/"/g, '""');
      const cleanPhone = `+${m.phone}`;
      const groupTags = m.groups.map((g) => `${g.groupName} (${g.role === 'admin' ? 'مشرف' : 'عضو'})`).join(' | ').replace(/"/g, '""');

      csv += `"${cleanPhone}","${cleanName}","${groupTags}","${m.id}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="all_members_with_tags.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// SPA fallback
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/socket.io')) {
    return next();
  }
  const indexDist = path.join(distPath, 'index.html');
  if (fs.existsSync(indexDist)) {
    return res.sendFile(indexDist);
  }
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start Server and automatically start Baileys connection listener
server.listen(PORT, () => {
  console.log(`===============================================`);
  console.log(` منصة إدارة مجموعات ومجتمعات واتساب تعمل الآن `);
  console.log(` الرابط: http://localhost:${PORT}`);
  console.log(`===============================================`);
  wa.init();
});

