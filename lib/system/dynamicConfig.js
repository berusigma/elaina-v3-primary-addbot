'use strict';

const fs = require('fs');
const path = require('path');

const CONFIG_DIR = path.join(process.cwd(), 'database');
const DYNAMIC_CONFIG_PATH = path.join(CONFIG_DIR, 'dynamic_settings.json');

const defaultSettings = {
    owner: "6285813708397",
    nobot: "6285119732048",
    nomorowner: "6285813708397",
    namaowner: "FallZx Infinity",
    namaBot: "𝑬𝒍𝒂𝒊𝒏𝒆 𝑻𝒉𝒆 𝑷𝒓𝒊𝒎𝒂𝒓𝒚",
    thumnail2: "https://files.catbox.moe/i58vrz.jpg",
    replyimg: "https://files.catbox.moe/2hhala.jpg",
    ppowner: "https://files.catbox.moe/h5zya9.png",
    menuBg: "https://u.pone.rs/ezchqsab.jpg",
    welcomeBg: "https://files.catbox.moe/qbihzq.jpg",
    idch: "120363186130999681@newsletter",
    linkSaluran: "https://whatsapp.com/channel/0029Vb7MGFI7j6g0cOofOn1a",
    prefix: [".", "/", "#", "?"],
    welcome: true,
    leave: true,
    mute: false,
    onlygc: false,
    welcomeMessage: "Selamat datang di grup!",
    leaveMessage: "Selamat tinggal!",
    mess: {
        owner: "Fitur ini khusus Owner!",
        prem: "Fitur ini khusus Premium!",
        group: "Fitur ini hanya bisa di Group!",
        admin: "Fitur ini khusus Admin Group!",
        botadmin: "Bot harus menjadi Admin terlebih dahulu!",
        private: "Fitur ini hanya untuk Private Chat!",
        done: "Selesai!"
    }
};

function loadSettings() {
    try {
        if (!fs.existsSync(DYNAMIC_CONFIG_PATH)) {
            fs.writeFileSync(DYNAMIC_CONFIG_PATH, JSON.stringify(defaultSettings, null, 4));
            return defaultSettings;
        }
        const data = fs.readFileSync(DYNAMIC_CONFIG_PATH, 'utf8');
        return Object.assign({}, defaultSettings, JSON.parse(data));
    } catch (err) {
        console.error('[DynamicConfig] Failed to read settings, fallback to defaults:', err);
        return defaultSettings;
    }
}

function saveSettings(newSettings) {
    try {
        if (!fs.existsSync(CONFIG_DIR)) {
            fs.mkdirSync(CONFIG_DIR, { recursive: true });
        }
        const current = loadSettings();
        const updated = Object.assign({}, current, newSettings, { updatedAt: Date.now() });
        const tmpPath = DYNAMIC_CONFIG_PATH + '.tmp';
        fs.writeFileSync(tmpPath, JSON.stringify(updated, null, 4));
        fs.renameSync(tmpPath, DYNAMIC_CONFIG_PATH);
        applyToGlobals(updated);
        return { success: true, settings: updated };
    } catch (err) {
        console.error('[DynamicConfig] Failed to save settings:', err);
        return { success: false, error: err.message };
    }
}

function applyToGlobals(cfg) {
    const config = cfg || loadSettings();
    global.owner = config.owner;
    global.nobot = config.nobot;
    global.nomorowner = config.nomorowner;
    global.namaowner = config.namaowner;
    global.namaBot = config.namaBot;
    global.thumnail2 = config.thumnail2;
    global.replyimg = config.replyimg;
    global.creator = `${config.owner}@s.whatsapp.net`;
    global.foother = `© ${config.namaBot}`;
    global.ppowner = config.ppowner;
    global.versi = config.namaBot;
    global.menuBg = config.menuBg;
    global.welcomeBg = config.welcomeBg;
    global.idch = config.idch;
    global.linkSaluran = config.linkSaluran;
    global.mess = config.mess;
    global.mute = config.mute;
    global.onlygc = config.onlygc;
    global.nama = config.namaBot;
    global.namach = config.namaBot;
    global.namafile = global.foother;
    global.author = config.namaowner;
    global.welcome = config.welcome;
    global.leave = config.leave;
    global.welcomeMessage = config.welcomeMessage;
    global.leaveMessage = config.leaveMessage;
    global.prefix = Array.isArray(config.prefix) ? config.prefix : [".", "/", "#", "?"];
    global.packname = config.namaBot;
}

module.exports = {
    loadSettings,
    saveSettings,
    applyToGlobals
};
