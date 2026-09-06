/* Case: brat
 * Exported: 13/4/2026, 08.24.56
 * Lines: 60
 * Complexity: 6
 */

case 'brat': {
    bulter.sendMessage(m.chat, { react: { text: '⏳', key: m.key } });

    if (!text) return replyButton(`❯  🟩 *BRAT GENERATOR*

  📌 *Cara Pakai:*
  ${prefix}brat <teks>

  📝 *Contoh:*
  ${prefix}brat i'm so brat
  ${prefix}brat kamu nyebelin

  🎨 *Varian Brat:*
  • ${prefix}brat → sticker biasa
  • ${prefix}brathd → sticker HD 1024px
  • ${prefix}bratvid → sticker animasi
  • ${prefix}furbrat → versi fur/furry
`, [
        { buttonId: `.bratvid brat`, buttonText: { displayText: '🎬 Brat Video' }, type: 1 },
        { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
    ]);

    try {
        const url = `https://api.nexray.web.id/maker/brat?text=${encodeURIComponent(text)}`;
        const res = await fetch(url);
        const buffer = Buffer.from(await res.arrayBuffer());

        await bulter.sendImageAsSticker(m.chat, buffer, m, {
            packname: "ᴀᴇɢɪs ᴀ",
            author: " ʙʏ ᴋʏʏɪɴғɪ"
        });

        bulter.sendMessage(m.chat, { react: { text: '✅', key: m.key } });

        replyButton(`\`*BRAT BERHASIL*\`

  ✅ Sticker brat berhasil!
  📝 *${text.length > 40 ? text.slice(0, 37) + '...' : text}*

  💡 Coba versi lain:
`, [
            { buttonId: `.brathd ${text}`, buttonText: { displayText: '✨ Brat HD' }, type: 1 },
            { buttonId: `.bratvid ${text}`, buttonText: { displayText: '🎬 Brat Video' }, type: 1 },
            { buttonId: `.furbrat ${text}`, buttonText: { displayText: '🦊 Fur Brat' }, type: 1 },
            { buttonId: `.brat ${text}`, buttonText: { displayText: '🔄 Ulang' }, type: 1 }
        ]);

    } catch (e) {
        console.error('Brat error:', e.message);
        bulter.sendMessage(m.chat, { react: { text: '❌', key: m.key } });
        replyButton(`❯  ❌ *BRAT GAGAL*

  😵 Server API sedang down.
  Coba versi lain:
`, [
            { buttonId: `.brathd ${text}`, buttonText: { displayText: '✨ Coba Brat HD' }, type: 1 },
            { buttonId: `.menu`, buttonText: { displayText: '🏠 Menu' }, type: 1 }
        ]);
    }
    break;