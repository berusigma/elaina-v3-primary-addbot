'use strict';

const { jidDecode, downloadContentFromMessage, prepareWAMessageMedia } = require('@whiskeysockets/baileys');
const PhoneNumber = require('awesome-phonenumber');
const FileType = require('file-type');
const fs = require('fs');
const { getBuffer } = require('./myfunction');
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid, addExif } = require('./exif');

function decorateSocket(sock, store) {
    sock.public = true;

    sock.decodeJid = (jid) => {
        if (!jid) return jid;
        if (/:\d+@/gi.test(jid)) {
            let decode = jidDecode(jid) || {};
            return (decode.user && decode.server && decode.user + '@' + decode.server) || jid;
        } else return jid;
    };

    sock.getName = (jid, withoutContact = false) => {
        const id = sock.decodeJid(jid);
        withoutContact = sock.withoutContact || withoutContact;
        let v;
        if (id.endsWith("@g.us")) {
            return new Promise(async (resolve) => {
                v = store?.contacts?.[id] || {};
                if (!(v.name || v.subject)) v = (await sock.groupMetadata(id).catch(() => ({}))) || {};
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'));
            });
        } else {
            v = id === '0@s.whatsapp.net' ? { id, name: 'WhatsApp' } : id === sock.decodeJid(sock.user?.id) ? sock.user : (store?.contacts?.[id] || {});
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international');
        }
    };

    sock.sendText = async (jid, text, quoted = '', options = {}) => {
        return sock.sendMessage(jid, { text, ...options }, { quoted });
    };

    sock.sendTextWithMentions = async (jid, text, quoted, options = {}) => {
        return sock.sendMessage(jid, {
            text,
            mentions: [...text.matchAll(/@(\d{0,16})/g)].map(v => v[1] + '@s.whatsapp.net'),
            ...options
        }, { quoted });
    };

    sock.downloadMediaMessage = async (message) => {
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(message, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        return buffer;
    };

    sock.downloadAndSaveMediaMessage = async (message, filename, attachExtension = true) => {
        let quoted = message.msg ? message.msg : message;
        let mime = (message.msg || message).mimetype || '';
        let messageType = message.mtype ? message.mtype.replace(/Message/gi, '') : mime.split('/')[0];
        const stream = await downloadContentFromMessage(quoted, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk]);
        }
        let type = await FileType.fromBuffer(buffer);
        let trueFileName = attachExtension ? filename + '.' + (type ? type.ext : 'bin') : filename;
        fs.writeFileSync(trueFileName, buffer);
        return trueFileName;
    };

    sock.getFile = async (message, returnBuffer = true, savePath = '') => {
        if (!message || (!message.msg && !message.message)) throw new Error('Invalid message');
        const m = message.msg || message.message;
        let mime, messageType, filename;
        if (m.imageMessage) { mime = m.imageMessage.mimetype; messageType = 'image'; filename = m.imageMessage.fileName || `image_${Date.now()}`; }
        else if (m.videoMessage) { mime = m.videoMessage.mimetype; messageType = 'video'; filename = m.videoMessage.fileName || `video_${Date.now()}`; }
        else if (m.audioMessage) { mime = m.audioMessage.mimetype; messageType = 'audio'; filename = m.audioMessage.fileName || `audio_${Date.now()}`; }
        else if (m.documentMessage) { mime = m.documentMessage.mimetype; messageType = 'document'; filename = m.documentMessage.fileName || `document_${Date.now()}`; }
        else if (m.stickerMessage) { mime = m.stickerMessage.mimetype; messageType = 'sticker'; filename = `sticker_${Date.now()}`; }
        else throw new Error('Unsupported message type');

        const stream = await downloadContentFromMessage(m, messageType);
        let buffer = Buffer.from([]);
        for await (const chunk of stream) buffer = Buffer.concat([buffer, chunk]);

        const fileType = await FileType.fromBuffer(buffer);
        let extension = fileType ? fileType.ext : (mime ? mime.split('/')[1]?.split(';')[0] || 'bin' : 'bin');
        if (filename && !filename.includes('.')) filename = `${filename}.${extension}`;

        if (savePath) {
            const fullPath = savePath.endsWith('/') ? savePath + filename : savePath;
            fs.writeFileSync(fullPath, buffer);
        }
        return { buffer, filename, mime, extension, size: buffer.length };
    };

    sock.sendFile = async (jid, pathFile, filename = '', caption = '', quoted = null, options = {}) => {
        let buffer;
        if (Buffer.isBuffer(pathFile)) { buffer = pathFile; }
        else if (typeof pathFile === 'string') {
            if (/^data:.*?\/.*?;base64,/i.test(pathFile)) buffer = Buffer.from(pathFile.split`,`[1], 'base64');
            else if (/^https?:\/\//.test(pathFile)) buffer = await getBuffer(pathFile);
            else if (fs.existsSync(pathFile)) buffer = fs.readFileSync(pathFile);
            else throw new Error('Invalid file path');
        } else throw new Error('Invalid input');

        let fileType = await FileType.fromBuffer(buffer);
        let mime = fileType ? fileType.mime : 'application/octet-stream';
        let extension = fileType ? fileType.ext : 'bin';
        if (!filename) filename = `file_${Date.now()}.${extension}`;

        let messageType = mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : 'document';
        let messageContent = { [messageType]: buffer, caption: caption || '', fileName: filename, mimetype: mime, ...options };
        return await sock.sendMessage(jid, messageContent, { quoted });
    };

    sock.sendImageAsSticker = async (jid, pathFile, quoted, options = {}) => {
        let buff = Buffer.isBuffer(pathFile) ? pathFile : /^data:.*?\/.*?;base64,/i.test(pathFile) ? Buffer.from(pathFile.split`,`[1], 'base64') : /^https?:\/\//.test(pathFile) ? await getBuffer(pathFile) : fs.existsSync(pathFile) ? fs.readFileSync(pathFile) : Buffer.alloc(0);
        let buffer = (options && (options.packname || options.author)) ? await writeExifImg(buff, options) : await addExif(buff);
        return await sock.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
    };

    sock.sendVideoAsSticker = async (jid, pathFile, quoted, options = {}) => {
        let buff = Buffer.isBuffer(pathFile) ? pathFile : /^data:.*?\/.*?;base64,/i.test(pathFile) ? Buffer.from(pathFile.split`,`[1], 'base64') : /^https?:\/\//.test(pathFile) ? await getBuffer(pathFile) : fs.existsSync(pathFile) ? fs.readFileSync(pathFile) : Buffer.alloc(0);
        let buffer = (options && (options.packname || options.author)) ? await writeExifVid(buff, options) : await videoToWebp(buff);
        return await sock.sendMessage(jid, { sticker: { url: buffer }, ...options }, { quoted });
    };

    return sock;
}

module.exports = decorateSocket;
