'use strict';

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');

const dynamicConfig = require('./lib/system/dynamicConfig');

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Store active sub-bot instances & QR sessions
const activeSubBots = new Map();
const activeQRSessions = new Map();

// In-Memory Live Logs Buffer
const systemLogs = [];
const MAX_LOGS = 200;

function addLog(type, message) {
    const timestamp = new Date().toLocaleTimeString('id-ID', { hour12: false });
    const logEntry = { timestamp, type, message };
    systemLogs.push(logEntry);
    if (systemLogs.length > MAX_LOGS) systemLogs.shift();
}

// Override stdout / stderr for Live Log Buffer
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
// Auto-Reconnect Existing Sub-Bots on Boot
// -------------------------------------------------------------
async function autoConnectSavedBots() {
    try {
        const folders = fs.readdirSync(SESSIONS_DIR);
        for (const folder of folders) {
            if (folder.startsWith('subbot_')) {
                const phoneNumber = folder.replace('subbot_', '');
                console.log(`[AutoConnect] Menghubungkan ulang sub-bot +${phoneNumber}...`);
                initSubBotSession(phoneNumber);
            }
        }
    } catch (err) {
        console.error('[AutoConnect] Error reconnecting bots:', err);
    }
}

async function initSubBotSession(phoneNumber) {
    const botSessionDir = path.join(SESSIONS_DIR, `subbot_${phoneNumber}`);
    try {
        const { state, saveCreds } = await useMultiFileAuthState(botSessionDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu('Chrome')
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
                console.log(`[SubBot +${phoneNumber}] Connection CLOSED (Status: ${statusCode || 'unknown'}). Reconnect: ${shouldReconnect}`);
                
                if (shouldReconnect) {
                    setTimeout(() => initSubBotSession(phoneNumber), 5000);
                } else {
                    activeSubBots.delete(phoneNumber);
                    if (fs.existsSync(botSessionDir)) {
                        fs.rmSync(botSessionDir, { recursive: true, force: true });
                    }
                }
            } else if (connection === 'open') {
                activeSubBots.set(phoneNumber, {
                    sock,
                    status: 'CONNECTED',
                    connectedAt: Date.now()
                });
                console.log(`[SubBot +${phoneNumber}] ✅ CONNECTED & READY!`);
            }
        });

        activeSubBots.set(phoneNumber, {
            sock,
            status: sock.authState.creds.registered ? 'CONNECTING' : 'PAIRING_READY',
            connectedAt: Date.now()
        });

        return sock;
    } catch (err) {
        console.error(`[SubBot +${phoneNumber}] Init Exception:`, err);
    }
}

// -------------------------------------------------------------
// API Endpoints
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
    if (result.success) {
        console.log('[Settings] Dynamic settings updated via Web Dashboard');
    }
    res.json(result);
});

// 4. List Sub-Bots
app.get('/api/bots', (req, res) => {
    const botsList = [];
    const processedNums = new Set();

    activeSubBots.forEach((bot, number) => {
        processedNums.add(number);
        botsList.push({
            number,
            status: bot.status || 'CONNECTED',
            connectedAt: bot.connectedAt || Date.now()
        });
    });

    const folders = fs.readdirSync(SESSIONS_DIR);
    folders.forEach(folder => {
        if (folder.startsWith('subbot_')) {
            const num = folder.replace('subbot_', '');
            if (!processedNums.has(num)) {
                botsList.push({
                    number: num,
                    status: 'INACTIVE',
                    connectedAt: null
                });
            }
        }
    });

    res.json({ success: true, bots: botsList });
});

// 5. Addbot - Method 1: Pairing Code
app.post('/api/addbot/pairing', async (req, res) => {
    let { phoneNumber } = req.body;
    if (!phoneNumber) {
        return res.status(400).json({ success: false, error: 'Nomor HP wajib diisi!' });
    }

    phoneNumber = String(phoneNumber).replace(/[^0-9]/g, '');
    if (phoneNumber.length < 10) {
        return res.status(400).json({ success: false, error: 'Nomor HP tidak valid! Gunakan format 628xxx' });
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
            browser: Browsers.ubuntu('Chrome')
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

                    console.log(`[Addbot] Pairing Code generated for +${phoneNumber}: ${code}`);
                    return res.json({
                        success: true,
                        phoneNumber,
                        pairingCode: code,
                        message: 'Pairing code berhasil dibuat!'
                    });
                } catch (err) {
                    console.error('[Addbot] Error pairing:', err);
                    return res.status(500).json({ success: false, error: 'Gagal membuat pairing code: ' + err.message });
                }
            }, 2500);
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
                message: 'Bot nomor ini sudah terhubung & aktif!'
            });
        }

        sock.ev.on('connection.update', (update) => {
            const { connection, lastDisconnect } = update;
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut;
                if (!shouldReconnect) {
                    activeSubBots.delete(phoneNumber);
                    if (fs.existsSync(botSessionDir)) fs.rmSync(botSessionDir, { recursive: true, force: true });
                }
            } else if (connection === 'open') {
                activeSubBots.set(phoneNumber, {
                    sock,
                    status: 'CONNECTED',
                    connectedAt: Date.now()
                });
                console.log(`[Addbot] Sub-bot +${phoneNumber} CONNECTED via Pairing Code!`);
            }
        });

    } catch (err) {
        console.error('[Addbot] Exception:', err);
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 6. Addbot - Method 2: QR Code Generator & Listener (Fixed Handshake & Clean Temp Session)
app.post('/api/addbot/qr-start', async (req, res) => {
    const sessionId = 'qr_session_' + Date.now();
    const tempDir = path.join(SESSIONS_DIR, `temp_${sessionId}`);

    // Clean any old temp sessions first
    try {
        const folders = fs.readdirSync(SESSIONS_DIR);
        folders.forEach(f => {
            if (f.startsWith('temp_')) {
                fs.rmSync(path.join(SESSIONS_DIR, f), { recursive: true, force: true });
            }
        });
    } catch {}

    try {
        const { state, saveCreds } = await useMultiFileAuthState(tempDir);
        const { version } = await fetchLatestBaileysVersion();

        const sock = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: false,
            auth: state,
            browser: Browsers.ubuntu('Chrome'), // Fixed standard browser for WhatsApp Web QR Handshake!
            syncFullHistory: false
        });

        sock.ev.on('creds.update', saveCreds);

        const sessionObject = {
            sessionId,
            sock,
            tempDir,
            status: 'INITIALIZING',
            qrDataUrl: null,
            phoneNumber: null,
            createdAt: Date.now()
        };
        activeQRSessions.set(sessionId, sessionObject);

        sock.ev.on('connection.update', async (update) => {
            const { qr, connection, lastDisconnect } = update;
            
            if (qr) {
                try {
                    const qrDataUrl = await QRCode.toDataURL(qr, { margin: 2, scale: 8 });
                    sessionObject.qrDataUrl = qrDataUrl;
                    sessionObject.status = 'QR_READY';
                    console.log(`[Addbot QR] Fresh QR Code generated for session ${sessionId}`);
                } catch (qrErr) {
                    console.error('[Addbot QR] Error generating QR Data URL:', qrErr);
                }
            }

            if (connection === 'open') {
                const userNum = sock.user.id.split(':')[0].split('@')[0];
                sessionObject.status = 'CONNECTED';
                sessionObject.phoneNumber = userNum;
                console.log(`[Addbot QR] ✅ Sub-bot +${userNum} CONNECTED via QR Code!`);

                // Move temp directory to permanent subbot directory
                const permanentDir = path.join(SESSIONS_DIR, `subbot_${userNum}`);
                if (fs.existsSync(permanentDir)) {
                    fs.rmSync(permanentDir, { recursive: true, force: true });
                }
                fs.renameSync(tempDir, permanentDir);

                // Register to activeSubBots
                activeSubBots.set(userNum, {
                    sock,
                    status: 'CONNECTED',
                    connectedAt: Date.now()
                });

                activeQRSessions.delete(sessionId);
            } else if (connection === 'close') {
                const statusCode = (lastDisconnect?.error)?.output?.statusCode;
                if (statusCode === DisconnectReason.loggedOut) {
                    activeQRSessions.delete(sessionId);
                    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true, force: true });
                }
            }
        });

        res.json({
            success: true,
            sessionId,
            message: 'Sesi QR Code diinisialisasi...'
        });

    } catch (err) {
        console.error('[Addbot QR] Exception:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// 7. Poll QR Session Status
app.get('/api/addbot/qr-status/:sessionId', (req, res) => {
    const { sessionId } = req.params;
    if (!activeQRSessions.has(sessionId)) {
        return res.json({ success: false, status: 'EXPIRED_OR_CLOSED' });
    }

    const sess = activeQRSessions.get(sessionId);
    res.json({
        success: true,
        status: sess.status,
        qrDataUrl: sess.qrDataUrl,
        phoneNumber: sess.phoneNumber
    });
});

// 8. Logout / Reset Specific Sub-Bot Session
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

    console.log(`[Addbot] Sub-bot +${phoneNumber} logged out and session deleted.`);
    res.json({ success: true, message: `Sub-bot +${phoneNumber} berhasil di-logout & dihapus.` });
});

// 9. Reset All Inactive / Stuck Sessions
app.post('/api/bots/reset-sessions', (req, res) => {
    try {
        let deletedCount = 0;
        const folders = fs.readdirSync(SESSIONS_DIR);
        folders.forEach(f => {
            if (f.startsWith('temp_')) {
                fs.rmSync(path.join(SESSIONS_DIR, f), { recursive: true, force: true });
                deletedCount++;
            }
        });
        activeQRSessions.clear();
        console.log(`[ResetSessions] ${deletedCount} temporary stuck QR sessions cleaned up.`);
        res.json({ success: true, message: `${deletedCount} sesi temp/stuck berhasil dibersihkan.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// 10. Get Live Terminal Logs
app.get('/api/logs', (req, res) => {
    res.json({ success: true, logs: systemLogs });
});

// Start Server & Auto-Connect
server.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(` ⚡ ELAINA V3 ULTRA-PREMIUM DASHBOARD & ADDBOT SERVER `);
    console.log(` 📍 Status : ONLINE (Browsers.ubuntu('Chrome') Fixed QR)`);
    console.log(` 🌐 Web UI : http://localhost:${PORT}`);
    console.log(`======================================================\n`);

    autoConnectSavedBots();
});
