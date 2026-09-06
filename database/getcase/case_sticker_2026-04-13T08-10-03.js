/* Case: sticker
 * Exported: 13/4/2026, 08.10.03
 * Lines: 80
 * Complexity: 9
 */

case 'sticker': {
    const q = m.quoted ? m.quoted : m;
    const mimeQ = (q.msg || q).mimetype || '';

    if (!m.quoted || (!/image/.test(mimeQ) && !/video/.test(mimeQ))) {
        return replyButton(`❯  🎭 *STICKER MAKER*

  📌 *Cara Pakai:*
  Reply gambar/video + ketik:
  *${prefix}sticker*

  ✅ *Support:*
  • Gambar (JPG/PNG/WebP)
  • Video/GIF (maks 10 detik)

  💡 *Tips:*
  Pakai *${prefix}wm pack|author*
  untuk custom nama sticker
`, [
            { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
        ]);
    }

    bulter.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    try {
        if (/video/.test(mimeQ)) {
            const durasi = (q.msg || q).seconds || 0;
            if (durasi > 10) return replyButton(`❯  ⚠️ *VIDEO TERLALU PANJANG*

  🚫 Durasi video maks *10 detik*
  Video kamu: *${durasi} detik*

  Coba potong video terlebih dulu.
`, [
                { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
            ]);

            const media = await bulter.downloadMediaMessage(q);
            await bulter.sendVideoAsSticker(m.chat, media, m, {
                packname: global.packname || global.namaBot,
                author: global.author || global.namaowner
            });
        } else {
            const media = await bulter.downloadMediaMessage(q);
            await bulter.sendImageAsSticker(m.chat, media, m, {
                packname: global.packname || global.namaBot,
                author: global.author || global.namaowner
            });
        }

        bulter.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        replyButton(`❯  🎭 *STICKER BERHASIL*

  ✅ Sticker berhasil dibuat!

  💡 *Mau custom nama sticker?*
  Klik tombol di bawah 👇
`, [
            { buttonId: `.wm ${global.packname || global.namaBot}|${global.namaowner}`, buttonText: { displayText: '🏷️ Custom Watermark' }, type: 1 },
            { buttonId: `.toimg`, buttonText: { displayText: '🖼️ Sticker → Gambar' }, type: 1 },
            { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
        ]);

    } catch (e) {
        console.error('Sticker error:', e.message);
        bulter.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        replyButton(`❯  ❌ *GAGAL BUAT STICKER*

  😵 *Error:* ${e.message}

  Pastikan:
  • Gambar tidak corrupt
  • Video maks 10 detik
`, [
            { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
        ]);
    }
    break;