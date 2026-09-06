'use strict';
const path = require('path');
const fs   = require('fs');
const os   = require('os');

const _isTTY = process.stdout.isTTY === true;
const _state = {
    status:       'STARTING',
    mode:         '—',
    botName:      'BulterBot',
    owner:        '—',
    startTime:    Date.now(),
    cmdCount:     0,
    msgCount:     0,
    groupCount:   0,
    premiumCount: 0,
    sewaActive:   0,
    lastCmd:      '—',
    lastSender:   '—',
    antiban:      false,
    logs:         [],
    errors:       [],
};

const _pair = {
    active:      false,   
    phase:       'idle', 
    code:        null,   
    phone:       '',      
    codeTs:      0,       
    blink:       false,   
};

const _MAX_LOGS   = 5;
const _MAX_ERRORS = 3;

const C = {
    r:  '\x1b[0m',
    b:  '\x1b[1m',
    d:  '\x1b[2m',
    cy: '\x1b[36m',
    gr: '\x1b[32m',
    ye: '\x1b[33m',
    rd: '\x1b[31m',
    mg: '\x1b[35m',
    wh: '\x1b[37m',
    bR: '\x1b[41m',
    bG: '\x1b[42m',
    bD: '\x1b[100m',
};


const _WIDE_RE = /[\u1100-\u115F\u2E80-\u303E\u3041-\u33BF\u33FF-\uA4CF\uAC00-\uD7AF\uF900-\uFAFF\uFE30-\uFE4F\uFF00-\uFFEF\u{1F300}-\u{1FFFF}\u{20000}-\u{2FFFD}\u{30000}-\u{3FFFD}]/gu;
const _ANSI_RE = /\x1b\[[0-9;]*m/g;

function _vlen(s) {
    const clean = String(s || '').replace(_ANSI_RE, '');
    let extra = 0;
    const wideMatches = clean.match(_WIDE_RE);
    if (wideMatches) extra = wideMatches.length;
    return clean.length + extra;
}

function _strip(s) { return String(s || '').replace(_ANSI_RE, ''); }

const BW = 46;

function _row(lStr, lLen, rStr, rLen) {
    const used = 1 + lLen + 1 + (rLen || 0);
    const gap  = Math.max(1, BW - used);
    const right = rStr ? `${' '.repeat(gap)}${rStr} ` : ' '.repeat(BW - 1 - lLen);
    return `${C.d}│${C.r} ${lStr}${right}${C.d}│${C.r}`;
}

const _LCW = Math.floor(BW / 2) - 1; 

function _kv(lb1, v1, lb2, v2) {
    const l1 = `${C.d}${lb1}${C.r}${v1}`;
    const l1len = lb1.length + _vlen(String(v1 || '').replace(_ANSI_RE, ''));

    if (!lb2 && !v2) {
        return _row(l1, l1len, '', 0);
    }

    const r2 = `${C.d}${lb2}${C.r}${v2}`;
    const r2len = lb2.length + _vlen(String(v2 || '').replace(_ANSI_RE, ''));

    const gap = Math.max(1, BW - 1 - l1len - r2len - 1);
    return `${C.d}│${C.r} ${l1}${' '.repeat(gap)}${r2} ${C.d}│${C.r}`;
}

function _sec(label) {
    const raw = ` ${label} `;
    const pad = Math.max(0, BW - raw.length - 1);
    return `${C.d}├─${C.cy}${C.b}${raw}${C.r}${C.d}${'─'.repeat(pad)}┤${C.r}`;
}

function _div() { return `${C.d}├${'─'.repeat(BW)}┤${C.r}`; }
function _top() { return `${C.cy}╭${'─'.repeat(BW)}╮${C.r}`; }
function _bot() { return `${C.cy}╰${'─'.repeat(BW)}╯${C.r}`; }

// Baris full-width (satu konten)
function _full(str) {
    const slen = _vlen(_strip(str));
    const pad  = Math.max(0, BW - 1 - slen);
    return `${C.d}│${C.r} ${str}${' '.repeat(pad)}${C.d}│${C.r}`;
}

function _uptime(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d > 0) return `${d}d${h}h`;
    if (h > 0) return `${h}h${m}m`;
    if (m > 0) return `${m}m${s}s`;
    return `${s}s`;
}

function _time() {
    return new Date().toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
    });
}

function _num(n) {
    const v = Number(n) || 0;
    if (v >= 1000000) return (v / 1000000).toFixed(1) + 'M';
    if (v >= 1000)    return (v / 1000).toFixed(1) + 'K';
    return String(v);
}

function _mem() {
    const m = process.memoryUsage();
    return {
        rss:   Math.round(m.rss / 1048576),
        heap:  Math.round(m.heapUsed / 1048576),
        total: Math.round(m.heapTotal / 1048576),
    };
}

function _bar(used, total, w) {
    const p = Math.min(1, Number(used) / Math.max(1, Number(total)));
    const f = Math.round(p * w);
    const col = p > 0.9 ? C.rd : p > 0.7 ? C.ye : C.gr;
    return `${col}${'|'.repeat(f)}${C.d}${'-'.repeat(w - f)}${C.r}`;
}

function _spark(vals, w) {
    const t = ['_', '.', '-', '+', 'x', 'X', '#', '@'];
    if (!vals || vals.length === 0) return `${C.d}${'.'.repeat(w)}${C.r}`;
    const sl = vals.slice(-w);
    const mn = Math.min(...sl), mx = Math.max(...sl), rn = mx - mn || 1;
    let o = '';
    for (const v of sl) o += t[Math.min(7, Math.floor(((v - mn) / rn) * 7))];
    return `${C.d}${'·'.repeat(w - sl.length)}${C.r}${C.cy}${o}${C.r}`;
}

function _elapsed(ts) {
    if (!ts) return '—';
    const d = Math.floor((Date.now() - ts) / 1000);
    if (d < 3)    return 'now';
    if (d < 60)   return d + 's';
    if (d < 3600) return Math.floor(d / 60) + 'm';
    return Math.floor(d / 3600) + 'h';
}

function _sIcon(s) {
    if (s === 'CONNECTED')    return `${C.gr}●${C.r}`;
    if (s === 'RECONNECTING') return `${C.ye}*${C.r}`;
    if (s === 'OFFLINE')      return `${C.rd}○${C.r}`;
    return `${C.d}o${C.r}`;
}

//
let _rateHist = [];
let _lastSnap = 0;
let _lastRateTs = Date.now();
let _peakCpm = 0;
let _peakMem = 0;
let _lastCmdTs = 0;
let _errTotal = 0;
let _busy = false;

function _tickRate() {
    const now = Date.now();
    const elapsed = (now - _lastRateTs) / 1000;
    if (elapsed >= 1) {
        const rate = Math.round((_state.msgCount - _lastSnap) / elapsed);
        _rateHist.push(rate);
        if (_rateHist.length > 20) _rateHist.shift();
        _lastSnap  = _state.msgCount;
        _lastRateTs = now;
    }
    const rss = process.memoryUsage().rss / 1048576;
    if (rss > _peakMem) _peakMem = rss;
}


const _DB_DIR  = path.join(process.cwd(), 'database');
const _DB_FILE = path.join(_DB_DIR, 'bulter.db');
const _JSON    = {
    groups:  path.join(_DB_DIR, 'group.json'),
    premium: path.join(_DB_DIR, 'premium.json'),
    premDB:  path.join(_DB_DIR, 'premiumdb.json'),
    sewa:    path.join(_DB_DIR, 'sewa.json'),
    banned:  path.join(_DB_DIR, 'banned.json'),
};

let _sqlite = null;
let _sqliteOK = false;

// Lazy-load SQLite saat pertama kali sync
function _getSQLite() {
    if (_sqliteOK) return _sqlite;
    if (_sqlite === false) return null; // sudah dicoba & gagal
    try {
        const Database = require('better-sqlite3');
        if (fs.existsSync(_DB_FILE)) {
            _sqlite = new Database(_DB_FILE, { readonly: true, fileMustExist: true });
            _sqliteOK = true;
            return _sqlite;
        }
    } catch {}
    _sqlite = false;
    return null;
}

function _jRead(p, fb) {
    try {
        if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf8'));
    } catch {}
    return fb;
}

function _syncDB() {
    try {
        const db = _getSQLite();

        let grpCount = 0;
        if (db) {
            try {
                const row = db.prepare(
                    "SELECT COUNT(*) AS cnt FROM simple_lists WHERE list_name = 'groups'"
                ).get();
                grpCount = row?.cnt || 0;
            } catch {}
        }
        if (!grpCount) {
            const arr = _jRead(_JSON.groups, []);
            grpCount = Array.isArray(arr) ? arr.length : Object.keys(arr).length;
        }

        let premCount = 0;
        if (db) {
            try {
                const row = db.prepare(
                    "SELECT COUNT(*) AS cnt FROM simple_lists WHERE list_name = 'premium'"
                ).get();
                premCount = row?.cnt || 0;
            } catch {}
        }
        if (!premCount) {
            // Coba premiumdb.json dulu (lebih lengkap)
            const pdb = _jRead(_JSON.premDB, null);
            if (pdb && typeof pdb === 'object') {
                premCount = Object.keys(pdb).length;
            } else {
                const arr = _jRead(_JSON.premium, []);
                premCount = Array.isArray(arr) ? arr.length : Object.keys(arr).length;
            }
        }

        let sewaCount = 0;
        if (db) {
            try {
                const now = Date.now();
                const row = db.prepare(
                    `SELECT COUNT(*) AS cnt FROM sewa
                     WHERE lifetime = 1 OR (expiry IS NOT NULL AND expiry > ${now})`
                ).get();
                sewaCount = row?.cnt || 0;
            } catch {}
        }
        if (!sewaCount) {
            const sewa = _jRead(_JSON.sewa, {});
            const now  = Date.now();
            for (const [, v] of Object.entries(sewa)) {
                if (v.lifetime || (v.expiry && v.expiry > now)) sewaCount++;
            }
        }

        let bannedCount = 0;
        if (db) {
            try {
                const row = db.prepare(
                    "SELECT COUNT(*) AS cnt FROM simple_lists WHERE list_name = 'banned'"
                ).get();
                bannedCount = row?.cnt || 0;
            } catch {}
        }
        if (!bannedCount) {
            const arr = _jRead(_JSON.banned, []);
            bannedCount = Array.isArray(arr) ? arr.length : 0;
        }

        // Simpan ke state
        _state.groupCount   = grpCount;
        _state.premiumCount = premCount;
        _state.sewaActive   = sewaCount;

        // Update antiban label dengan info ban
        if (bannedCount > 0 && typeof _state.antiban !== 'boolean') {
            _state._bannedCount = bannedCount;
        }

    } catch (e) {
        // Silent fail — logger tidak boleh crash bot
    }
}

// Jalankan sync pertama kali + tiap 30 detik
setImmediate(() => {
    try { _syncDB(); } catch {}
});
if (!global._LOGGER_DB_SYNC) {
    global._LOGGER_DB_SYNC = setInterval(() => {
        try { _syncDB(); } catch {}
    }, 30000);
}

function _build() {
    const up  = Math.floor((Date.now() - _state.startTime) / 1000);
    const m   = _mem();
    const rt  = _rateHist.length > 0 ? _rateHist[_rateHist.length - 1] : 0;
    const cpm = up > 0 ? (_state.cmdCount / (up / 60)).toFixed(1) : '0.0';
    if (parseFloat(cpm) > _peakCpm) _peakCpm = parseFloat(cpm);

    const banIcon = (_state.antiban === true || _state.antiban === 'ON')
        ? `${C.gr}ON${C.r}` : `${C.rd}o${C.r}`;

    const R = [];

    R.push(_top());
    {
        const title = `${C.cy}${C.b}* ${_state.botName}${C.r}`;
        const ttime = `${C.d}${_time()}${C.r}`;
        R.push(_kv('', title, '', ttime));
    }

    //
    R.push(_sec('SYS'));
    R.push(_kv('', `${_sIcon(_state.status)} ${C.b}${_state.status}${C.r}`, ' ', `${C.ye}${_state.mode}${C.r}`));
    R.push(_kv('up  ', `${C.gr}${_uptime(up)}${C.r}`, 'own ', `${C.wh}${String(_state.owner).slice(0, 12)}${C.r}`));


    R.push(_sec('STAT'));
    R.push(_kv('cmd ', `${C.ye}${_num(_state.cmdCount)}${C.d}(${cpm}/m)${C.r}`, 'msg ', `${C.wh}${_num(_state.msgCount)}${C.r}`));
    R.push(_kv('grp ', `${C.cy}${_state.groupCount}${C.r}`, 'err ', `${C.rd}${_errTotal}${C.r}`));
    R.push(_kv('prm ', `${C.mg}${_state.premiumCount}${C.r}`, 'sew ', `${C.cy}${_state.sewaActive}${C.r}`));

    // Rate + sparkline
    {
        const spark = _spark(_rateHist, 12);
        const rtStr = `${C.d}rate ${C.r}${spark}${C.d} ${rt}/s${C.r}`;
        const pkStr = `${C.d}pk${C.r}${C.ye}${_peakCpm.toFixed(0)}${C.d}/m${C.r}`;
        // manual row karena spark mengandung karakter non-standard
        const rtLen = 5 + 12 + 1 + String(rt).length + 2; // "rate " + spark(12) + " " + rt + "/s"
        const pkLen = 2 + String(_peakCpm.toFixed(0)).length + 2; // "pk" + val + "/m"
        const gap   = Math.max(1, BW - 1 - rtLen - pkLen - 1);
        R.push(`${C.d}│${C.r} ${rtStr}${' '.repeat(gap)}${pkStr} ${C.d}│${C.r}`);
    }


    R.push(_sec('RES'));
    {
        const bar    = _bar(m.heap, m.total, 10);
        // bar visual = 10 chars ('|' dan '-')
        const memStr = `${C.d}mem ${C.r}${bar} ${C.d}${m.heap}/${m.total}M${C.r}`;
        const cpuStr = `${C.d}cpu${C.r}${C.wh}${_mem_cpu()}%${C.r}`;
        const memLen = 4 + 10 + 1 + String(m.heap).length + 1 + String(m.total).length + 1; // "mem " + bar(10) + " " + heap/total + "M"
        const cpuLen = 3 + _mem_cpu().length + 1;
        const gap    = Math.max(1, BW - 1 - memLen - cpuLen - 1);
        R.push(`${C.d}│${C.r} ${memStr}${' '.repeat(gap)}${cpuStr} ${C.d}│${C.r}`);
    }
    R.push(_kv('rss ', `${C.wh}${m.rss}M${C.r}`, 'pk  ', `${C.ye}${Math.round(_peakMem)}M${C.r}`));

    R.push(_sec('ACT'));
    R.push(_kv('cmd ', `${C.wh}${String(_state.lastCmd).slice(0, 14)}${C.r}`, '    ', `${C.d}${_elapsed(_lastCmdTs)}${C.r}`));
    R.push(_kv('usr ', `${C.wh}${String(_state.lastSender).slice(0, 12)}${C.r}`, 'ban ', banIcon));

    if (_state.logs.length > 0) {
        R.push(_sec('LOG'));
        for (const l of _state.logs) {
            const s = String(l).slice(0, BW - 3);
            const ic = /error|fail/i.test(s) ? `${C.rd}!${C.r}` : `${C.d}>${C.r}`;
            R.push(_full(`${ic}${C.d}${s}${C.r}`));
        }
    }

    if (_state.errors.length > 0) {
        R.push(_sec('ERR'));
        for (const e of _state.errors) {
            R.push(_full(`${C.rd}!${C.r}${C.d}${String(e).slice(0, BW - 3)}${C.r}`));
        }
    }

    R.push(_bot());
    return R;
}

// Cache CPU karena hitungnya berat
let _cpuCache = '?';
let _cpuTs = 0;
function _mem_cpu() {
    const now = Date.now();
    if (now - _cpuTs < 2000) return _cpuCache;
    try {
        const cpus = os.cpus();
        let idle = 0, total = 0;
        for (const c of cpus) {
            for (const t of Object.values(c.times)) total += t;
            idle += c.times.idle;
        }
        _cpuCache = (100 - (idle / total) * 100).toFixed(0);
    } catch { _cpuCache = '?'; }
    _cpuTs = now;
    return _cpuCache;
}

// ── Render ────────────────────────────────────────────────────────
let _prevLines = 0;


// ── Pairing screen builder ────────────────────────────────────────
function _buildPairing() {
    const R = [];
    const bn = _state.botName;

    R.push(_top());
    R.push(_kv('', `${C.cy}${C.b}* ${bn}${C.r}`, '', `${C.d}${_time()}${C.r}`));
    R.push(_sec('SETUP'));

    if (_pair.phase === 'waiting_number') {
        R.push(_full(`${C.cy}● WhatsApp Pairing${C.r}`));
        R.push(_full(`${C.d}────────────────────────────────────────────────────${C.r}`));
        R.push(_full(`${C.wh}Status      ${C.d}:${C.r} Waiting for phone number`));
        R.push(_full(`${C.wh}Format      ${C.d}:${C.r} ${C.cy}628xxxxxxxxxx${C.r}`));
        R.push(_full(`${C.wh}Example     ${C.d}:${C.r} ${C.cy}6281234567890${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.gr}> Enter your WhatsApp number below...${C.r}`));

    } else if (_pair.phase === 'waiting_code') {
        R.push(_full(`${C.cy}● WhatsApp Pairing${C.r}`));
        R.push(_full(`${C.d}────────────────────────────────────────────────────${C.r}`));
        R.push(_full(`${C.wh}Status      ${C.d}:${C.r} Generating pairing code...`));
        R.push(_full(`${C.wh}Phone       ${C.d}:${C.r} ${C.cy}${_pair.phone}${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.ye}> Contacting WhatsApp server...${C.r}`));

    } else if (_pair.phase === 'code_shown') {
        const elapsed = Math.floor((Date.now() - _pair.codeTs) / 1000);
        const expire = Math.max(0, 120 - elapsed);
        const expCol = expire < 30 ? C.rd : expire < 60 ? C.ye : C.gr;
        const codeStr = String(_pair.code || '');

        _pair.blink = !_pair.blink;

        R.push(_full(`${C.cy}● WhatsApp Pairing${C.r}`));
        R.push(_full(`${C.d}────────────────────────────────────────────────────${C.r}`));
        R.push(_full(`${C.wh}Status      ${C.d}:${C.r} ${C.gr}Ready${C.r}`));
        R.push(_full(`${C.wh}Phone       ${C.d}:${C.r} ${C.cy}${_pair.phone}${C.r}`));
        R.push(_full(`${C.wh}Expires     ${C.d}:${C.r} ${expCol}${expire}s${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.d}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.b}${C.cy}           ${codeStr}${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.d}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${C.r}`));
        R.push(_full(""));
        R.push(_full(`${C.wh}Settings${C.r}`));
        R.push(_full(`${C.wh}└── Linked Devices${C.r}`));
        R.push(_full(`${C.wh}    └── Link a Device${C.r}`));
        R.push(_full(`${C.wh}        └── Enter the code above${C.r}`));
    }

    R.push(_bot());
    return R;
}
function _render() {
    if (!_isTTY || _busy) return;
    _busy = true;
    if (!_pair.active) { try { _tickRate(); } catch {} }
    try {
        const rows = _pair.active ? _buildPairing() : _build();
        if (_prevLines > 0) {
            process.stdout.write(`\x1b[${_prevLines}A\x1b[0J`);
        }
        process.stdout.write(rows.join('\n') + '\n');
        _prevLines = rows.length;
    } catch (_re) {
        _prevLines = 0;
    } finally {
        _busy = false;
    }
}


function _simple(lv, tag, msg) {
    const ic = { info: 'i', warn: '!', error: 'x', cmd: '>', sys: '*' }[lv] || '>';
    const cl = { info: C.cy, warn: C.ye, error: C.rd, cmd: C.gr, sys: C.d }[lv] || C.d;
    process.stdout.write(`${C.d}${_time()}${C.r} ${cl}${ic}${C.r} ${C.d}[${tag}]${C.r} ${msg}\n`);
}

// 
function update(patch = {}) {
    Object.assign(_state, patch);
    if (_isTTY) _render();
}

function log(tag, msg) {
    const entry = `${_time()} [${tag}] ${msg}`;
    _state.logs.push(entry);
    if (_state.logs.length > _MAX_LOGS) _state.logs.shift();
    if (_isTTY) _render(); else _simple('info', tag, msg);
}

function error(tag, msg) {
    _errTotal++;
    const entry = `${_time()} [${tag}] ${msg}`;
    _state.errors.push(entry);
    if (_state.errors.length > _MAX_ERRORS) _state.errors.shift();
    if (_isTTY) _render(); else _simple('error', tag, msg);
}

function cmd(command, sender, isGroup) {
    _state.cmdCount++;
    _state.lastCmd    = command;
    _lastCmdTs        = Date.now();
    _state.lastSender = sender
        ? ('+' + String(sender).replace(/[^0-9]/g, '').slice(-8))
        : '—';
    if (_isTTY) _render();
    else _simple('cmd', 'CMD', `${command} | ${_state.lastSender} | ${isGroup ? 'grp' : 'dm'}`);
}

function msg() {
    _state.msgCount++;
    if (_isTTY) _render();
}

function setStatus(st) {
    _state.status = st;
    if (_isTTY) _render();
    else _simple('sys', 'STS', st);
}

function setBotInfo(patch = {}) { update(patch); }

function startTicker() {
    if (!_isTTY) return;
    if (global._LOGGER_TICKER) {
        try { _render(); } catch {}
        return;
    }
    try { process.stdout.write('\x1b[2J\x1b[H'); } catch {}
    _prevLines = 0;
    _render();
    global._LOGGER_TICKER = setInterval(() => {
        try { _render(); } catch {}
    }, 1000);
}

function syncNow() { _syncDB(); }


// 

function enterPairingMode() {
    _pair.active = true;
    _pair.phase  = 'waiting_number';
    _pair.code   = null;
    _pair.phone  = '';
    _pair.codeTs = 0;

    // Stop ticker normal supaya dashboard tidak overwrite prompt
    if (global._LOGGER_TICKER) {
        clearInterval(global._LOGGER_TICKER);
        global._LOGGER_TICKER = null;
    }

    // Render pairing screen sekarang
    if (_isTTY) {
        process.stdout.write('\x1b[2J\x1b[H');
        _prevLines = 0;
        _render();
        // Ticker lambat khusus pairing (tidak overwrite input readline)
        global._LOGGER_PAIR_TICKER = setInterval(() => {
            // Hanya render ulang saat phase code_shown (blink effect)
            if (_pair.phase === 'code_shown') _render();
        }, 1000);
    } else {
        // Non-TTY: print header pairing sederhana
        process.stdout.write(`\n${C.cy}● WhatsApp Pairing${C.r}\n`);
        process.stdout.write(`${C.d}────────────────────────────────────────────────────${C.r}\n`);
        process.stdout.write(`${C.wh}Status      ${C.d}:${C.r} Waiting for phone number\n`);
        process.stdout.write(`${C.wh}Input       ${C.d}:${C.r} 628xxxxxxxxxx\n\n`);
    }
}

function setPairingPhone(phone) {
    _pair.phone = String(phone || '').trim();
    _pair.phase = 'waiting_code';
    if (_isTTY) _render();
    else process.stdout.write(`${C.cy}[Pairing] Generating kode untuk ${_pair.phone}...${C.r}\n`);
}

function setPairingCode(code) {
    _pair.code   = String(code || '').trim();
    _pair.codeTs = Date.now();
    _pair.phase  = 'code_shown';
    if (_isTTY) {
        _render();
    } else {
        // Non-TTY: print kode besar supaya terlihat jelas
        process.stdout.write(`\n${C.cy}╔══════════════════════╗${C.r}\n`);
        process.stdout.write(`${C.cy}║  ${C.b}${C.ye}PAIRING CODE${C.r}${C.cy}        ║${C.r}\n`);
        process.stdout.write(`${C.cy}║  ${C.b}${C.gr}${String(code).padEnd(20)}${C.r}${C.cy}║${C.r}\n`);
        process.stdout.write(`${C.cy}╚══════════════════════╝${C.r}\n`);
        process.stdout.write(`${C.ye}Masukkan kode di WhatsApp > Setelan > Perangkat Tertaut${C.r}\n\n`);
    }
}

function exitPairingMode() {
    const wasActive = _pair.active;
    _pair.active = false;
    _pair.phase  = 'idle';

    if (global._LOGGER_PAIR_TICKER) {
        clearInterval(global._LOGGER_PAIR_TICKER);
        global._LOGGER_PAIR_TICKER = null;
    }

    _state.status = 'CONNECTED';

    if (_isTTY) {
        if (wasActive) {
            try { process.stdout.write('\x1b[2J\x1b[H'); } catch {}
            _prevLines = 0;
        }
        _render();
        startTicker();
    } else {
        if (wasActive) _simple('sys', 'AUTH', 'Login berhasil! Dashboard aktif.');
    }
}

// Bungkus readline.question supaya bisa dipakai dari index.js
// tanpa harus import readline ulang
function pairingPrompt(promptText) {
    const readline = require('readline');
    return new Promise((resolve) => {
        try {
            process.stdout.write(String(promptText || ''));
        } catch {}
        const rl = readline.createInterface({
            input:    process.stdin,
            output:   process.stdout,
            terminal: _isTTY,
        });
        const _timeout = setTimeout(() => {
            try { rl.close(); } catch {}
            resolve('');
        }, 120000);
        rl.question('', (answer) => {
            clearTimeout(_timeout);
            try { rl.close(); } catch {}
            try { if (_isTTY) process.stdout.write('\n'); } catch {}
            resolve(String(answer || '').trim());
        });
        rl.on('error', () => { clearTimeout(_timeout); resolve(''); });
        rl.on('close', () => { clearTimeout(_timeout); resolve(''); });
    });
}

module.exports = {
    update, log, error, cmd, msg,
    setStatus, setBotInfo, startTicker, syncNow,
    enterPairingMode, setPairingPhone, setPairingCode,
    exitPairingMode, pairingPrompt,
    get state() { return _state; },
    get pairState() { return _pair; },
};

if (!global._LOGGER_PROC_GUARD) {
    global._LOGGER_PROC_GUARD = true;
    process.on('uncaughtException', (err) => {
        try {
            const msg = `[CRASH] : ${err?.message || err}`;
            if (_isTTY) {
                _state.errors.push(msg);
                if (_state.errors.length > _MAX_ERRORS) _state.errors.shift();
                _busy = false;
                _render();
            } else {
                process.stderr.write(msg + '\n');
            }
        } catch {}
    });
    process.on('unhandledRejection', (reason) => {
        try {
            const msg = `[CRASH] unhandledRejection: ${reason?.message || String(reason || '')}`;
            if (_isTTY) {
                _state.errors.push(msg);
                if (_state.errors.length > _MAX_ERRORS) _state.errors.shift();
                _busy = false;
                _render();
            } else {
                process.stderr.write(msg + '\n');
            }
        } catch {}
    });
}
