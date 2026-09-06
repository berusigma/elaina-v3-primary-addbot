'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const dynamicConfig = require('./lib/system/dynamicConfig');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------------------------------------------
// GLOBAL SESSION & QR STATE (PERSISTENT & MEMORY)
// -------------------------------------------------------------
const sessions = {};  // Nyimpen socket & status per sessionId / nomor
const qrCodes = {};   // Nyimpen DataURL Base64 QR Code

// In-Memory Live Logs Buffer
const systemLogs = [];
const MAX_LOGS = 200;

function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const logEntry = { timestamp, type, message };
    systemLogs.push(logEntry);
    if (systemLogs.length > MAX_LOGS) systemLogs.shift();
}

const origLog = console.log;
const origErr = console.error;
console.log = function (...args) {
    origLog.apply(console, args);
    addLog('INFO', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
};
console.error = function (...args) {
    origErr.apply(console, args);
    addLog('ERROR', args.map(a => (typeof a === 'object' ? JSON.stringify(a) : a)).join(' '));
};

// Helper: Ensure sessions directory
const SESSIONS_DIR = path.join(__dirname, 'sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// -------------------------------------------------------------
// CORE ENGINE: START BOT SESSION (QR CODE & PAIRING)
// -------------------------------------------------------------
async function startBotSession(sessionId, isPairing = false, phoneNumber = '') {
    const sessionDir = path.join(SESSIONS_DIR, `auth_info_${sessionId}`);
    try {
        const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

        const sock = makeWASocket({
            auth: state,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            browser: ['Elaina Workspace', 'Chrome', '1.0.0']
        });

        sessions[sessionId] = {
            sock,
            status: 'Menghubungkan...',
            number: phoneNumber || sessionId,
            createdAt: Date.now()
        };

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            // Logika Simpan QR Code ke DataURL Base64
            if (qr) {
                try {
                    qrCodes[sessionId] = await QRCode.toDataURL(qr);
                    if (sessions[sessionId]) {
                        sessions[sessionId].status = 'Menunggu Scan QR';
                    }
                    console.log(`[Session ${sessionId}] 📸 QR Code baru dihasilkan`);
                } catch (err) {
                    console.error(`[Session ${sessionId}] Gagal generate QR URL:`, err);
                }
            }

            if (connection === 'close') {
                delete qrCodes[sessionId];
                if (sessions[sessionId]) sessions[sessionId].status = 'Terputus (Offline)';

                const statusCode = lastDisconnect?.error?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[Session ${sessionId}] Connection CLOSED (Code: ${statusCode || 'unknown'}). Reconnect: ${shouldReconnect}`);

                if (shouldReconnect) {
                    setTimeout(() => startBotSession(sessionId, isPairing, phoneNumber), 4000);
                } else {
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                    }
                    delete sessions[sessionId];
                }
            } else if (connection === 'open') {
                delete qrCodes[sessionId];
                const botNum = sock.user ? sock.user.id.split(':')[0].split('@')[0] : (phoneNumber || sessionId);
                if (sessions[sessionId]) {
                    sessions[sessionId].status = 'Online ✅';
                    sessions[sessionId].number = botNum;
                }
                console.log(`[Session ${sessionId}] ✅ TERHUBUNG & ONLINE! (+${botNum})`);
            }
        });

        // Logika Pairing Code
        if (isPairing && phoneNumber && !sock.authState.creds.registered) {
            setTimeout(async () => {
                try {
                    const code = await sock.requestPairingCode(phoneNumber);
                    if (sessions[sessionId]) {
                        sessions[sessionId].pairingCode = code;
                        sessions[sessionId].status = 'Pairing Code Ready';
                    }
                    console.log(`[Session ${sessionId}] 📱 Pairing Code untuk +${phoneNumber}: ${code}`);
                } catch (pErr) {
                    console.error(`[Session ${sessionId}] Gagal request pairing code:`, pErr);
                }
            }, 2500);
        }

        return sock;
    } catch (err) {
        console.error(`[Session ${sessionId}] Exception startBotSession:`, err);
    }
}

// -------------------------------------------------------------
// Auto-Reconnect Session yang Pernah Dibuat saat Server Restart
// -------------------------------------------------------------
function autoLoadSessions() {
    try {
        const folders = fs.readdirSync(SESSIONS_DIR);
        folders.forEach(f => {
            if (f.startsWith('auth_info_')) {
                const sessionId = f.replace('auth_info_', '');
                console.log(`[AutoLoad] Memuat ulang sesi: ${sessionId}...`);
                startBotSession(sessionId);
            }
        });
    } catch (err) {
        console.error('[AutoLoad] Error:', err);
    }
}

// -------------------------------------------------------------
// API ENDPOINTS
// -------------------------------------------------------------

// 1. Get System Status
app.get('/api/status', (req, res) => {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const ramUsageMB = (process.memoryUsage().rss / (1024 * 1024)).toFixed(1);

    res.json({
        success: true,
        system: {
            uptime: Math.floor(process.uptime()),
            ramUsedMB: ramUsageMB,
            totalMemGB: (totalMem / (1024 * 1024 * 1024)).toFixed(2),
            freeMemGB: (freeMem / (1024 * 1024 * 1024)).toFixed(2),
            cpuCount: os.cpus().length,
            platform: os.platform(),
            nodeVersion: process.version
        },
        activeBotsCount: Object.keys(sessions).length
    });
});

// 2. Get Settings
app.get('/api/settings', (req, res) => {
    const settings = dynamicConfig.loadSettings();
    res.json({ success: true, settings });
});

// 3. Save Settings
app.post('/api/settings', (req, res) => {
    const result = dynamicConfig.saveSettings(req.body);
    res.json(result);
});

// 4. List Active Bots
app.get('/api/bots', (req, res) => {
    const botsList = [];
    for (const [id, sess] of Object.entries(sessions)) {
        botsList.push({
            id,
            number: sess.number || id,
            status: sess.status || 'Offline',
            hasQR: !!qrCodes[id],
            hasPairing: !!sess.pairingCode,
            pairingCode: sess.pairingCode || null
        });
    }
    res.json({ success: true, bots: botsList });
});

// 5. Start QR Session
app.post('/api/addbot/qr-start', (req, res) => {
    const sessionId = req.body.session_id || 'bot_' + Date.now();
    if (!sessions[sessionId]) {
        startBotSession(sessionId);
    }
    res.json({ success: true, sessionId, message: 'Sesi QR berhasil dibuat!' });
});

// 6. Get QR Status for a Session
app.get('/api/addbot/qr-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    const sess = sessions[sessionId];
    const qrCode = qrCodes[sessionId] || null;

    res.json({
        success: true,
        exists: !!sess,
        status: sess ? sess.status : 'Non-Existent',
        qrCode: qrCode,
        number: sess ? sess.number : null
    });
});

// 7. Start Pairing Code Session
app.post('/api/addbot/pairing', (req, res) => {
    let { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ success: false, error: 'Nomor HP wajib diisi!' });

    phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    const sessionId = `pair_${phoneNumber}`;

    if (!sessions[sessionId]) {
        startBotSession(sessionId, true, phoneNumber);
    }

    res.json({ success: true, sessionId, phoneNumber, message: 'Memproses pairing code...' });
});

// 8. Delete / Logout / Clear Session
app.post('/api/bots/delete', async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, error: 'ID Sesi wajib diisi' });

    delete qrCodes[id];

    if (sessions[id]) {
        try { sessions[id].sock.logout(); } catch {}
        delete sessions[id];
    }

    const sessionDir = path.join(SESSIONS_DIR, `auth_info_${id}`);
    if (fs.existsSync(sessionDir)) {
        fs.rmSync(sessionDir, { recursive: true, force: true });
    }

    console.log(`[DeleteSession] Sesi ${id} berhasil dihapus.`);
    res.json({ success: true, message: `Sesi ${id} berhasil dihapus!` });
});

// 9. Reset All Pending / Temp Stuck Sessions
app.post('/api/bots/reset-stuck', (req, res) => {
    try {
        let count = 0;
        for (const [id, sess] of Object.entries(sessions)) {
            if (sess.status !== 'Online ✅') {
                delete qrCodes[id];
                try { sess.sock.logout(); } catch {}
                delete sessions[id];

                const sessionDir = path.join(SESSIONS_DIR, `auth_info_${id}`);
                if (fs.existsSync(sessionDir)) {
                    fs.rmSync(sessionDir, { recursive: true, force: true });
                }
                count++;
            }
        }
        res.json({ success: true, message: `${count} sesi stuck/offline berhasil dibersihkan!` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 10. Live Logs
app.get('/api/logs', (req, res) => {
    res.json({ success: true, logs: systemLogs });
});

// Start Server
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` ⚡ ELAINA V3 ULTRA-PREMIUM DASHBOARD & ADDBOT SERVER `);
    console.log(` 📍 Status : ONLINE (Logika QR + Session Reset)`);
    console.log(` 🌐 Web UI : http://localhost:${PORT}`);
    console.log(`======================================================\n`);

    autoLoadSessions();
});
