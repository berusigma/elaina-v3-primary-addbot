'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const pino = require('pino');

const dynamicConfig = require('./lib/system/dynamicConfig');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store sub-bot active socket instances
const activeSubBots = new Map();

// Helper: Ensure sessions directory
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// 1. Get System Status
app.get('/api/status', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const usedMem = totalMem - freeMem;
    const ramUsageMB = (process.memoryUsage().rss / (1024 * 1024)).toFixed(1);

    res.json({
        success: true,
        system: {
            uptime: Math.floor(process.uptime()),
            ramUsedMB: ramUsageMB,
            totalMemGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
            freeMemGB: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
            cpuCount: os.cpus().length,
            platform: os.platform()
        },
        activeBotsCount: activeSubBots.size
    });
});

// 2. Get Current Settings
app.get('/api/settings', (req, res) => {
    const settings = dynamicConfig.loadSettings();
    res.json({ success: true, settings });
});

// 3. Save Settings
app.post('/api/settings', (req, res) => {
    const result = dynamicConfig.saveSettings(req.body);
    res.json(result);
});

// 4. List Active Sub-Bots
app.get('/api/bots', (req, res) => {
    const botsList = [];
    activeSubBots.forEach((bot, number) => {
        botsList.push({
            number,
            status: bot.status || 'CONNECTED',
            connectedAt: bot.connectedAt || Date.now()
        });
    });

    // Also check saved session folders
    const folders = fs.readdirSync(SESSIONS_DIR);
    folders.forEach(folder => {
        if (folder.startsWith('subbot_')) {
            const num = folder.replace('subbot_', '');
            if (!activeSubBots.has(num)) {
                botsList.push({
                    number: num,
                    status: 'SAVED / INACTIVE',
                    connectedAt: null
                });
            }
        }
    });

    res.json({ success: true, bots: botsList });
});

// 5. Addbot - Request Pairing Code
app.post('/api/addbot/pairing', async (req, res) => {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Nomor HP wajib diisi!' });
    }

    phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10) {
        return res.status(400).json({ success: false, error: 'Nomor HP tidak valid!' });
    }

    try {
        const botSessionDir = path.join(SESSIONS_DIR, `subbot_${phoneNumber}`);
        const { state, saveCreds } = await useMultiFileAuthState(botSessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: ['Elaina Multi-Bot', 'Chrome', '1.0.0']
        });

        sock.ev.on('creds.update', saveCreds);

        if (!sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    activeSubBots.set(phoneNumber, {
                        sock,
                        status: 'PAIRING_READY',
                        pairingCode: code,
                        connectedAt: Date.now()
                    });

                    return res.json({
                        success: true,
                        phoneNumber,
                        pairingCode: code,
                        message: 'Pairing code berhasil dibuat! Masukkan di WhatsApp.'
                    });
                } catch (err) {
                    console.error('[Addbot] Error generating pairing code:', err);
                    return res.status(500).json({ success: false, error: 'Gagal membuat pairing code: ' + err.message });
                }
            }, 3000);
        } else {
            activeSubBots.set(phoneNumber, {
                sock,
                status: 'CONNECTED',
                connectedAt: Date.now()
            });

            return res.json({
                success: true,
                phoneNumber,
                pairingCode: null,
                message: 'Bot nomor ini sudah terdaftar & aktif!'
            });
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) {
                    activeSubBots.delete(phoneNumber);
                    fs.rmSync(botSessionDir, { recursive: true, force: true });
                }
            } else if (connection === 'open') {
                activeSubBots.set(phoneNumber, {
                    sock,
                    status: 'CONNECTED',
                    connectedAt: Date.now()
                });
                console.log(`[Addbot] Sub-bot ${phoneNumber} CONNECTED!`);
            }
        });

    } catch (err) {
        console.error('[Addbot] Exception:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Delete / Logout Sub-Bot
app.post('/api/bots/logout', async (req, res) => {
    let { phoneNumber } = req.body;
    phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');

    if (activeSubBots.has(phoneNumber)) {
        const bot = activeSubBots.get(phoneNumber);
        try { bot.sock.logout(); } catch {}
        activeSubBots.delete(phoneNumber);
    }

    const botSessionDir = path.join(SESSIONS_DIR, `subbot_${phoneNumber}`);
    if (fs.existsSync(botSessionDir)) {
        fs.rmSync(botSessionDir, { recursive: true, force: true });
    }

    res.json({ success: true, message: `Bot ${phoneNumber} berhasil di-logout & dihapus.` });
});

// Start Server
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` 🚀 ELAINA V3 WEB DASHBOARD & ADDBOT SERVER STARTED`);
    console.log(` 📍 Web URL: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
