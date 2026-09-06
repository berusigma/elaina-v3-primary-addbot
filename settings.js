/*
╔══════════════════════════════════════════════════════╗
║               𝗖𝗥𝗘𝗗𝗜𝗧𝗦 & 𝗖𝗢𝗣𝗬𝗥𝗜𝗚𝗛𝗧                ║
╚══════════════════════════════════════════════════════╝

Developer   : FallZx Infinity
Base ORI    : KyyInfinite
Version     : 3.0.0 (Optimized & Addbot Ready)

© Copyright 2026 FallZx Infinity. All Rights Reserved.
*/

const fs = require('fs');
const dynamicConfig = require('./lib/system/dynamicConfig');

// Load dynamic settings into global scope
dynamicConfig.applyToGlobals();

let file = require.resolve(__filename);
fs.watchFile(file, () => {
    fs.unwatchFile(file);
    console.log('\x1b[0;32m' + __filename + ' \x1b[1;32mupdated!\x1b[0m');
    delete require.cache[file];
    dynamicConfig.applyToGlobals();
});