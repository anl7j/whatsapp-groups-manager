import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import QRCode from 'qrcode';
import fs from 'fs';
import path from 'path';

export class WhatsAppManager {
  constructor(io) {
    this.io = io;
    this.sock = null;
    this.qrCode = null;
    this.qrCodeDataUrl = null;
    this.status = 'disconnected'; // 'disconnected' | 'connecting' | 'qr' | 'connected'
    this.user = null;
    this.authPath = path.resolve('./auth_info_baileys');
    this.logger = pino({ level: 'silent' });
    this.groupsCache = new Map();
    this.contacts = new Map(); // jid or lid -> { id, name, notify, verifiedName }
  }

  async init() {
    try {
      this.status = 'connecting';
      this.emitStatus();

      const { state, saveCreds } = await useMultiFileAuthState(this.authPath);
      const { version, isLatest } = await fetchLatestBaileysVersion();

      this.sock = makeWASocket({
        version,
        logger: this.logger,
        auth: state,
        browser: ['Mac OS', 'Chrome', '120.0.0'],
        syncFullHistory: false,
        generateHighQualityLinkPreview: true
      });

      this.sock.ev.on('creds.update', saveCreds);

      // Listen for history sync (messages and contacts)
      this.sock.ev.on('messaging-history.set', ({ contacts, messages }) => {
        if (contacts && Array.isArray(contacts)) {
          for (const c of contacts) {
            if (c.id) this.contacts.set(c.id, { ...(this.contacts.get(c.id) || {}), ...c });
            if (c.lid) this.contacts.set(c.lid, { ...(this.contacts.get(c.lid) || {}), ...c });
          }
        }
        if (messages && Array.isArray(messages)) {
          for (const m of messages) {
            const participant = m.key?.participant || m.participant || m.key?.remoteJid;
            if (participant && m.pushName) {
              const existing = this.contacts.get(participant) || {};
              this.contacts.set(participant, { ...existing, notify: m.pushName });
            }
          }
        }
      });

      // Listen for contacts and names
      this.sock.ev.on('contacts.upsert', (contacts) => {
        for (const c of contacts) {
          if (c.id) this.contacts.set(c.id, { ...(this.contacts.get(c.id) || {}), ...c });
          if (c.lid) this.contacts.set(c.lid, { ...(this.contacts.get(c.lid) || {}), ...c });
        }
      });

      this.sock.ev.on('contacts.update', (updates) => {
        for (const c of updates) {
          if (c.id) this.contacts.set(c.id, { ...(this.contacts.get(c.id) || {}), ...c });
          if (c.lid) this.contacts.set(c.lid, { ...(this.contacts.get(c.lid) || {}), ...c });
        }
      });

      this.sock.ev.on('messages.upsert', ({ messages }) => {
        for (const msg of messages) {
          const participant = msg.key?.participant || msg.key?.remoteJid;
          if (participant && msg.pushName) {
            const existing = this.contacts.get(participant) || {};
            this.contacts.set(participant, { ...existing, notify: msg.pushName });
          }
        }
      });

      this.sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          this.qrCode = qr;
          this.qrCodeDataUrl = await QRCode.toDataURL(qr, { scale: 7, margin: 2 });
          this.status = 'qr';
          this.emitStatus();
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

          this.status = 'disconnected';
          this.qrCode = null;
          this.qrCodeDataUrl = null;
          this.user = null;
          this.emitStatus();

          if (shouldReconnect) {
            console.log('Connection closed, reconnecting in 3 seconds...', lastDisconnect?.error?.message || lastDisconnect?.error);
            setTimeout(() => this.init(), 3000);
          } else {
            console.log('Logged out. Session cleared. Re-initializing for new QR login in 1.5 seconds...');
            this.clearSession();
            setTimeout(() => this.init(), 1500);
          }
        } else if (connection === 'open') {
          this.status = 'connected';
          this.qrCode = null;
          this.qrCodeDataUrl = null;

          const me = this.sock.user;
          this.user = {
            id: me?.id || '',
            name: me?.name || me?.notify || 'حساب الواتساب',
            phone: me?.id ? me.id.split(':')[0].replace(/[^0-9]/g, '') : ''
          };

          this.emitStatus();
          console.log(`WhatsApp connected successfully as: ${this.user.name} (${this.user.phone})`);
        }
      });

    } catch (err) {
      console.error('Error initializing WhatsApp socket:', err);
      this.status = 'disconnected';
      this.emitStatus();
    }
  }

  emitStatus() {
    if (!this.io) return;
    this.io.emit('status', {
      status: this.status,
      user: this.user,
      qr: this.qrCodeDataUrl
    });
  }

  clearSession() {
    try {
      if (fs.existsSync(this.authPath)) {
        fs.rmSync(this.authPath, { recursive: true, force: true });
      }
    } catch (e) {
      console.error('Failed to clear session directory:', e);
    }
  }

  async logout() {
    try {
      if (this.sock) {
        await this.sock.logout().catch(() => {});
      }
    } finally {
      this.clearSession();
      this.sock = null;
      this.status = 'disconnected';
      this.user = null;
      this.qrCode = null;
      this.qrCodeDataUrl = null;
      this.emitStatus();
      // re-init to allow new scan
      this.init();
    }
  }

  formatJid(id) {
    if (!id) return '';
    let clean = id.trim().replace(/[^0-9@.a-zA-Z_-]/g, '');
    if (!clean.includes('@')) {
      clean = `${clean}@s.whatsapp.net`;
    }
    return clean;
  }

  // --- Groups and Communities Methods ---

  async getAllGroups() {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }

    const participating = await this.sock.groupFetchAllParticipating();
    const myJid = this.sock.user?.id ? this.sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';

    this.groupsCache.clear();
    for (const [id, g] of Object.entries(participating)) {
      this.groupsCache.set(id, g);
    }

    const groups = Object.values(participating).map((g) => {
      const myParticipant = g.participants?.find((p) => p.id.split(':')[0] === myJid.split(':')[0]);
      const iAmAdmin = myParticipant?.admin === 'admin' || myParticipant?.admin === 'superadmin';
      const isCommunity = Boolean(g.isCommunity || g.isCommunityAnnounce || g.linkedParent);

      return {
        id: g.id,
        subject: g.subject || 'بدون اسم',
        desc: g.desc || '',
        creation: g.creation ? new Date(g.creation * 1000).toISOString() : null,
        owner: g.owner || g.subjectOwner || '',
        size: g.size || g.participants?.length || 0,
        participantsCount: g.participants?.length || 0,
        iAmAdmin,
        myRole: myParticipant?.admin || 'member',
        announce: Boolean(g.announce), // true = only admins can send
        restrict: Boolean(g.restrict), // true = only admins can edit info
        isCommunity: Boolean(g.isCommunity),
        isCommunityAnnounce: Boolean(g.isCommunityAnnounce),
        linkedParent: g.linkedParent || null
      };
    });

    return groups.sort((a, b) => (b.size || 0) - (a.size || 0));
  }

  async getGroupDetails(jid) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }

    let metadata = this.groupsCache.get(jid);
    if (!metadata) {
      try {
        metadata = await this.sock.groupMetadata(jid);
        this.groupsCache.set(jid, metadata);
      } catch (e) {
        console.error('Error fetching group metadata:', e);
        throw new Error('تعذر جلب بيانات المجموعة من واتساب');
      }
    }

    const myJid = this.sock.user?.id ? this.sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
    const myParticipant = metadata.participants?.find((p) => p.id.split(':')[0] === myJid.split(':')[0]);
    const iAmAdmin = myParticipant?.admin === 'admin' || myParticipant?.admin === 'superadmin';

    let inviteCode = null;
    let inviteUrl = null;
    if (iAmAdmin) {
      try {
        inviteCode = await this.sock.groupInviteCode(jid);
        inviteUrl = `https://chat.whatsapp.com/${inviteCode}`;
      } catch (e) {
        // Ignored if permissions don't allow
      }
    }

    const participants = (metadata.participants || []).map((p) => {
      const isLid = p.id.includes('@lid');
      const rawNumber = p.id.split('@')[0].split(':')[0];
      const displayPhone = `+${rawNumber}`;

      const contact = this.contacts.get(p.id) || (p.lid ? this.contacts.get(p.lid) : null);
      const name = contact?.notify || contact?.name || contact?.verifiedName || '';

      return {
        id: p.id,
        phone: rawNumber,
        displayPhone,
        name,
        isLid,
        admin: p.admin || null,
        isSuperAdmin: p.admin === 'superadmin',
        isAdmin: p.admin === 'admin' || p.admin === 'superadmin',
        isMe: p.id.split(':')[0] === myJid.split(':')[0]
      };
    });

    return {
      id: metadata.id,
      subject: metadata.subject,
      desc: metadata.desc || '',
      creation: metadata.creation ? new Date(metadata.creation * 1000).toISOString() : null,
      owner: metadata.owner || metadata.subjectOwner,
      size: metadata.size || participants.length,
      announce: Boolean(metadata.announce),
      restrict: Boolean(metadata.restrict),
      isCommunity: Boolean(metadata.isCommunity),
      isCommunityAnnounce: Boolean(metadata.isCommunityAnnounce),
      linkedParent: metadata.linkedParent || null,
      iAmAdmin,
      myRole: myParticipant?.admin || 'member',
      inviteCode,
      inviteUrl,
      participants
    };
  }

  async getAllParticipantsWithGroupTags() {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }

    if (this.groupsCache.size === 0) {
      await this.getAllGroups();
    }

    const myJid = this.sock.user?.id ? this.sock.user.id.split(':')[0] + '@s.whatsapp.net' : '';
    const membersMap = new Map();

    for (const [groupId, group] of this.groupsCache.entries()) {
      const groupName = group.subject || 'بدون اسم';
      const participants = group.participants || [];

      for (const p of participants) {
        const isLid = p.id.includes('@lid');
        const rawNumber = p.id.split('@')[0].split(':')[0];
        const displayPhone = `+${rawNumber}`;
        const contact = this.contacts.get(p.id) || (p.lid ? this.contacts.get(p.lid) : null);
        const name = contact?.notify || contact?.name || contact?.verifiedName || '';

        const groupTag = {
          groupId,
          groupName,
          role: p.admin || 'member',
          isAdmin: p.admin === 'admin' || p.admin === 'superadmin'
        };

        if (membersMap.has(p.id)) {
          const existing = membersMap.get(p.id);
          existing.groups.push(groupTag);
          if (name && !existing.name) existing.name = name;
        } else {
          membersMap.set(p.id, {
            id: p.id,
            phone: rawNumber,
            displayPhone,
            name,
            isLid,
            isMe: p.id.split(':')[0] === myJid.split(':')[0],
            groups: [groupTag]
          });
        }
      }
    }

    return Array.from(membersMap.values());
  }

  async updateParticipants(jid, participants, action) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }

    if (!['add', 'remove', 'promote', 'demote'].includes(action)) {
      throw new Error('إجراء غير صالح: يجب أن يكون add, remove, promote, أو demote');
    }

    const formattedList = participants.map((p) => this.formatJid(p));
    const response = await this.sock.groupParticipantsUpdate(jid, formattedList, action);
    return response;
  }

  async toggleGroupAnnounce(jid, isAnnounce) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    await this.sock.groupSettingUpdate(jid, isAnnounce ? 'announcement' : 'not_announcement');
    return { success: true, announce: isAnnounce };
  }

  async toggleGroupLocked(jid, isLocked) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    await this.sock.groupSettingUpdate(jid, isLocked ? 'locked' : 'unlocked');
    return { success: true, locked: isLocked };
  }

  async updateGroupSubject(jid, subject) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    await this.sock.groupUpdateSubject(jid, subject);
    return { success: true, subject };
  }

  async updateGroupDescription(jid, description) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    await this.sock.groupUpdateDescription(jid, description);
    return { success: true, description };
  }

  async getInviteCode(jid) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    const code = await this.sock.groupInviteCode(jid);
    return { code, url: `https://chat.whatsapp.com/${code}` };
  }

  async revokeInviteCode(jid) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    const newCode = await this.sock.groupRevokeInvite(jid);
    return { code: newCode, url: `https://chat.whatsapp.com/${newCode}` };
  }

  async sendMessage(jid, text) {
    if (this.status !== 'connected' || !this.sock) {
      throw new Error('واتساب غير متصل حالياً');
    }
    return await this.sock.sendMessage(jid, { text });
  }
}
