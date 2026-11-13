<p align="center">
  <img src="assets/logo.png" alt="WhatsApp Groups Manager Logo" width="220" style="border-radius: 20px;">
</p>

<h1 align="center">WhatsApp Groups & Communities Manager</h1>

<p align="center">
  <strong>An open-source, high-performance web dashboard & control center for managing WhatsApp groups and communities.</strong>
</p>

<p align="center">
  <a href="https://github.com/anl7j/whatsapp-groups-manager/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License: MIT">
  </a>
  <img src="https://img.shields.io/badge/Node.js-18+-blue.svg" alt="Node.js Version">
  <img src="https://img.shields.io/badge/React-18-61DAFB.svg?logo=react&logoColor=black" alt="React 18">
  <img src="https://img.shields.io/badge/shadcn%2Fui-authentic-black.svg" alt="shadcn/ui">
  <img src="https://img.shields.io/badge/Engine-Baileys-emerald.svg" alt="Baileys Engine">
  <img src="https://img.shields.io/badge/PRs-Welcome-brightgreen.svg" alt="PRs Welcome">
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#getting-started">Getting Started</a> •
  <a href="#api-reference">API Reference</a> •
  <a href="#contributing">Contributing</a> •
  <a href="README.ar.md">🇸🇦 النسخة العربية</a>
</p>

---

## 🌟 Overview

**WhatsApp Groups & Communities Manager** is a modern, lightweight, full-stack platform designed to give community leaders, educators, agencies, and e-commerce store owners full visibility and control over their WhatsApp ecosystem.

Powered directly by **Baileys** (WebSocket multi-device protocol) without requiring heavy Chromium/Puppeteer browsers, it consumes minimal memory and CPU while providing real-time synchronization, member extraction, group filtering, and an authentic **shadcn/ui** interface.

---

## ✨ Key Features

* **Instant Multi-Device Connection**:
  * Real-time QR code generation streamed via WebSockets (Socket.io).
  * Auto-reconnection and persistent local session management.

* **Groups & Communities Segmentation**:
  * Distinct filters for **Standard Groups**, **Communities**, and **Announcement Groups**.
  * Role-based breakdown: instantly see groups where you are an **Admin** vs. a **Member**.
  * Dynamic KPIs tracking total groups, unique reach, and member counts.

* **Unified Member Directory & Group Tags**:
  * Consolidate members across all groups in one directory.
  * Multi-group tagging: see exactly which groups each member belongs to with visual tags.
  * Filter members by group tags and search by name, phone number, or tag.

* **One-Click CSV / Excel Export**:
  * Export clean member lists per group or globally across all groups.
  * Formatted with UTF-8 BOM for seamless, error-free viewing in Microsoft Excel with Arabic support.

* **Group Administration**:
  * Promote to Admin / Demote from Admin with instant confirmation.
  * Kick / Remove disruptive members safely.
  * Add new members via phone number.
  * Toggle Announcement Mode (Admins-only messaging) on/off with one click.
  * Instant invite link retrieval & clipboard copying.

* **Direct Messaging**:
  * Send text announcements and messages directly to any group from the dashboard.

* **Enterprise-Grade UI (shadcn/ui)**:
  * Built using authentic **shadcn/ui** components (`Dialog`, `Table`, `Tabs`, `Card`, `Badge`, `Button`, `Input`).
  * Pure vector SVG icons (Lucide React) with zero cluttered emojis.
  * Clean dark-mode aesthetic with customizable Tailwind CSS design tokens.

---

## 🛠️ Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend & Engine** | Node.js (ESM), Express.js, `@whiskeysockets/baileys`, Socket.io |
| **Frontend Framework** | React 18, TypeScript, Vite 6 |
| **Design System** | **shadcn/ui**, Tailwind CSS 3.4, `@radix-ui/react-*`, Lucide React |
| **Data & Formatting** | CSV generator with RFC 5987 UTF-8 header encoding, KaTeX math-ready |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **npm**: v9.0.0 or higher
* An active **WhatsApp** account on your mobile device

### Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/anl7j/whatsapp-groups-manager.git
   cd whatsapp-groups-manager
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build the shadcn/ui frontend**:
   ```bash
   npm run build
   ```

4. **Start the application**:
   ```bash
   npm start
   ```

5. **Open your browser**:
   Navigate to [http://localhost:3000](http://localhost:3000)

### Development Mode
For development with hot-module-replacement (HMR):
```bash
# Terminal 1: Run Backend Server
npm run server

# Terminal 2: Run Vite Dev Server
npm run dev
```

---

## 📱 Linking Your WhatsApp Account

1. Open the dashboard in your browser.
2. If disconnected, a live **QR Code** will appear on screen.
3. Open WhatsApp on your phone ➔ **Settings** (or three dots menu) ➔ **Linked Devices**.
4. Tap **Link a Device** and scan the QR code.
5. Your session will be safely authenticated and cached in `./auth_info_baileys/`.

---

## 🔌 REST API Reference

The server exposes a clean REST API ready for integrations with CRMs, Zapier, Webhooks, and e-commerce platforms (e.g. Salla, Zid, Shopify):

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | Check WhatsApp socket status & authenticated user info |
| `GET` | `/api/groups` | Fetch all groups & communities with summary stats |
| `GET` | `/api/groups/:jid` | Get detailed metadata and full participant list for a group |
| `POST` | `/api/groups/:jid/participants` | Modify participants (`add`, `remove`, `promote`, `demote`) |
| `POST` | `/api/groups/:jid/setting` | Toggle group announcement mode (`{ type: "announce", value: true/false }`) |
| `GET` | `/api/groups/:jid/invite` | Get group invite code and URL |
| `POST` | `/api/groups/:jid/send` | Send a text message to a group (`{ message: "text" }`) |
| `GET` | `/api/groups/:jid/export-csv` | Download CSV of group members with UTF-8 support |
| `GET` | `/api/members` | Fetch unified directory of all members with group tags |
| `GET` | `/api/members/export-csv` | Download CSV of all members tagged with their groups |
| `POST` | `/api/logout` | Disconnect session and clear local credentials |

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

---

<p align="center">
  Crafted with care for the global open-source community.
</p>
