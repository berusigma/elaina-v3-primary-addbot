const fs = require('fs')
const axios = require('axios')

const _mcAllCats = {
    main: {
        emoji:'🏠', label:'MAIN', desc:'Command utama & monitoring bot',
        cmds:['menu','help','ping','status','speed','owner','ceksewa','bothealth','antibanstatus','safemode','warmupstatus','queuestatus','securityreport','auditlog','incidents','delayanalytics','forensiclog','reconnectstatus']
    },
    download: {
        emoji:'📥', label:'DOWNLOAD', desc:'Downloader berbagai platform',
        cmds:['tt','tiktok','ttmp3','igdl','fbdl','fbhd','ytmp3','ytmp4','threads','mediafire','capcut','soundcloud','terabox','tb','snackvideodl','svdl','pixeldraindl','pdl','videy','videydl']
    },
    hiburan: {
        emoji:'🎮', label:'HIBURAN', desc:'Fun, sticker & hiburan',
        cmds:['sticker','s','toimg','attp','ttp','quotesimage','wallpaper','emojimix','ship','shipping','truth','truthq','dare','tantang','confess','menfess','soulmatch','match','cekkhodam','khodam','rate','nilai','apakah','apa','akankah','akan','mimpiworld','dream','siapa','who','puisi','sajak']
    },
    tts: {
        emoji:'🎤', label:'TTS', desc:'Text to Speech berbagai karakter',
        cmds:['tts','say','ttsgoku','ttseminem','ttsmickey','ttsnahida','ttselon','ttsoptimus']
    },
    game: {
        emoji:'🎲', label:'GAME', desc:'Game interaktif di grup',
        cmds:['tebakkata','tebakword','susunkata','scramble','caklontong','cak','suit','rps']
    },
    stalker: {
        emoji:'🔍', label:'STALKER', desc:'Cek info akun sosmed & game',
        cmds:['igstalk','instagramstalk','tiktokstalk','ttstalk','ffstalk','stalkff','githubstalk','ghstalk']
    },
    cek: {
        emoji:'🎯', label:'CEK', desc:'Cek kepribadian & karakter',
        cmds:['cekcantik','cantik','cekganteng','ganteng','cekwibu','wibu','cekotaku','otaku','cekgamer','gamer','cekhoki','hoki','ceksial','sial','cekrezeki','rezeki','ceksetia','setia','cekbucin','bucin','cekgila','gila','cekmalas','malas']
    },
    primbon: {
        emoji:'🔮', label:'PRIMBON', desc:'Zodiak, mimpi & arti nama',
        cmds:['zodiak','horoscope','tafsirmimpi','mimpi','artinama','namameaning']
    },
    audio: {
        emoji:'🎵', label:'AUDIO FX', desc:'Efek suara dengan FFmpeg',
        cmds:['nightcore','nc','bass','bassboost','slow','slowed','fast','speed','robot','robotvoice','reverse','balik','earrape','loud','echo','gema','tupai','chipmunk']
    },
    canvas: {
        emoji:'🖼️', label:'CANVAS', desc:'Efek gambar & fake generator',
        cmds:['wanted','wantedposter','wasted','gta','jail','penjara','ektp','ktp','fakediscord','fakedc']
    },
    ephoto: {
        emoji:'✨', label:'EPHOTO', desc:'Efek teks dari ephoto360.com',
        cmds:['glitchtext','neonglitch','glowingtext','gradienttext','luxurygold','watercolortext','galaxystyle','summerbeach','royaltext','effectclouds','rainytext','cartoonstyle','papercutstyle','underwatertext','pixelglitch']
    },
    religi: {
        emoji:'🕌', label:'RELIGI', desc:'Jadwal sholat, doa & islami',
        cmds:['jadwalsholat','sholat2','asmaulhusna','asmaul','kisahnabi','nabi','doa','doaharian']
    },
    user: {
        emoji:'👤', label:'USER', desc:'Profil, level, koin & leaderboard',
        cmds:['profile','profil','daily','claim','exp','xp','koin','saldo','leaderboard','top']
    },
    search: {
        emoji:'🔎', label:'SEARCH', desc:'Brainly, Wattpad, bola & puisi',
        cmds:['brainly','brain','wattpad','jadwalbola','bola','puisi','sajak']
    },
    utility: {
        emoji:'🛠️', label:'UTILITY', desc:'Tools berguna sehari-hari',
        cmds:['ocr','readtext','wikipedia','wiki']
    },
    tools: {
        emoji:'🔧', label:'TOOLS', desc:'Utilitas & curl tools',
        cmds:['curl','download','npm','install','backup','autobackup','checklink','ceklink','delayanalytics','killswitch','resetwarn']
    },
    sewa: {
        emoji:'💰', label:'SEWA', desc:'Manajemen sewa bot',
        cmds:['ceksewa','addsewa','delsewa','extsewa','listsewa','sewa','invoice','inv']
    },
    statistik: {
        emoji:'📊', label:'STATISTIK', desc:'Statistik grup & keamanan',
        cmds:['statsgrup','groupstats','resetstats','reputation','rep','replist','bothealth','incidents','securitydashboard']
    },
    ai: {
        emoji:'🤖', label:'AI CHAT', desc:'Berbagai model AI chat',
        cmds:['chatgpt','openai','gptfree','freegpt','gptdemo','gpt4o','onlinegpt','gptlogin','gptchatly','gptonl','aichatfree','aifree','freechat','gptnet','deepseek','deepseekai','deepseekv3','deepseekr1','dsr1','gemini','geminiai','geminipro','geminiflash','geminithink','geminisearch','geminicode','learnlm','testgemini','groq','groqai','llama','llamaai','llamacode','mixtral','mixtralai','qwen','qwenai','gemma','gemmaai','mistralgroq','codechat','codeai','ai4chat','aichat','talkai','dola','cici','glm4','gitagpt','muslimai','mathgpt','dolphin','dolphinai','deepai2']
    },
    aiimg: {
        emoji:'🎨', label:'AI IMAGE', desc:'Generate & edit gambar dengan AI',
        cmds:['txt2img','imagine','animegen','aianimegen','sora2','soraai','nanobanana','imgedit','removebg','nobg','toghibli','ghiblistyle','toanime','animefy','toblack','tohitam','tochibi','chibistyle','tofigure','figurestyle','tofigurev2','tohijab','hijabstyle','tojapanese','japanesestyle','tomekah','meccabg','toemotebatu','to3d','3dfy','tocartoon','cartoonify','tomanga','mangafy','tooilpainting','oilpainting','tofigurine','figurine']
    },
    sticker: {
        emoji:'🪄', label:'STICKER', desc:'Buat & edit sticker kreatif',
        cmds:['sticker','s','toimg','attp','ttp','brat','bratvid','bratvideo','furbrat','removebg','nobg','emojimix','quotesimage','wallpaper','colongsw','pinterest']
    },
    grup: {
        emoji:'👥', label:'GRUP', desc:'Manajemen anggota & pengaturan grup',
        cmds:['promote','jadiadmin','demote','turonadmin','kick','keluarkan','kickall','add','tambah','kickinactive','cleangrup','tagall','everyone','hidetag','h','delete','del','setname','setnamegc','setdesc','cleardesc','infogc','groupinfo','setppgc','fotogrup','copygc','copymember','curimember','stealmbr','pin','pinpesan','unpin','unpinpesan','revoke','resetlink','setjoin','joinapproval','slowmode','proteksi','lockgrup','lockprofile','autoswgc','backupgrup','gpanel','topaktif','topmember','inaktif','memberinaktif']
    },
    proteksi: {
        emoji:'🛡️', label:'PROTEKSI', desc:'Sistem proteksi & moderasi grup',
        cmds:['antinsfw','antiocrlink','antiocrtext','antiraid','antilink','antilinkWA','antispam','antivortex','antiautobot','antiimage','antivideo','antidocument','antisticker','antiforward','warn','setwarn','maxwarn','listwarn','resetwarn','shadowban','sban','unshadowban','listshadowban','captcha','inviteguard','setantiraid','setantinsfw','infouser','whois']
    },
    security: {
        emoji:'🔐', label:'SECURITY', desc:'Keamanan lanjutan & forensik',
        cmds:['firewall','honeypot','lockdown','quarantine','threatintel','escalation','fullbackupsec','twofactor','2fa','trusteddevice','vault','messagevault','cmdacl','accesscontrol','sandboxscan','deeplink','linkanalysis','floodforensic','anomalycorrelation','mediascan','integritycheck','integritycek','rolehierarchy','repdecay','idlestatus','anomalystatus','forensicsearch','sessionhealth2','presencestatus','entropystatus','contentstatus','interactionstatus','degradationstatus','circadianstatus','poissoncheck','antiqueue','pausequeue','resumequeue']
    },
    doctor: {
        emoji:'🩺', label:'DOCTOR', desc:'AutoDoctor, health & diagnostik',
        cmds:['doctor','healthcheck','errorlog','autofix','sysinfo','repairlog','healthlog','bothealth','cekbot','sessionhealth','antibanstatus','safemode','warmupstatus','queuestatus','reconnectstatus','delayanalytics','forensiclog','circadianstatus','poissoncheck','degradationstatus','entropystatus']
    },
    rpg: {
        emoji:'⚔️', label:'RPG', desc:'Game RPG & kartu profil interaktif',
        cmds:['rpg','rpgmenu','rpgprofile','rpgstats','usercard','kartu','minicard','mc','mycard','profile','profil','daily','claim','exp','xp','koin','saldo','leaderboard','top','readvo','rvo','afk']
    },
    owner: {
        emoji:'👑', label:'OWNER', desc:'Panel khusus owner bot', ownerOnly: true,
        cmds:['addcase','approvecase','editcase','previewcase','cancelcase','listcase','rollbackcase','historycase','delcase','hapuscase','eval','ev','restart','self','public','npm','install','killswitch','safemode','addsewa','delsewa','extsewa','listsewa','addpremium','addprem','delpremium','delprem','listpremium','addowner','delowner','listowner','ban','unban','listban','backup','autobackup','backupdb','broadcast','bc','bcimg','setppbot','setnamebot','setbio','join','leave','block','unblock','addnomer','delnomer','curl','download','checklink','delayanalytics','forensiclog','auditlog','antibanstatus','warmupstatus','queuestatus','reconnectstatus']
    }
}

function _toSmallCaps(str) {
    const map = {'a':'ᴀ','b':'ʙ','c':'ᴄ','d':'ᴅ','e':'ᴇ','f':'ꜰ','g':'ɢ','h':'ʜ','i':'ɪ','j':'ᴊ','k':'ᴋ','l':'ʟ','m':'ᴍ','n':'ɴ','o':'ᴏ','p':'ᴘ','q':'ǫ','r':'ʀ','s':'ꜱ','t':'ᴛ','u':'ᴜ','v':'ᴠ','w':'ᴡ','x':'x','y':'ʏ','z':'ᴢ',' ':' '}
    return str.toLowerCase().split('').map(c => map[c] || c).join('')
}

global.allmenuButler = (prefix, isOwner) => {
    const _mBot   = global.namaBot   || 'Elaina The Primary'
    const _mOwner = global.namaowner || 'Owner'
    const _mUp    = Math.floor(process.uptime())
    const _mUpD   = Math.floor(_mUp / 86400)
    const _mUpH   = Math.floor((_mUp % 86400) / 3600)
    const _mUpM   = Math.floor((_mUp % 3600) / 60)
    const _mRam   = (process.memoryUsage().rss / 1048576).toFixed(1)
    const _mJam   = new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit', timeZone:'Asia/Jakarta' })
    const _mTgl   = new Date().toLocaleDateString('id-ID', { weekday:'long', day:'2-digit', month:'long', year:'numeric', timeZone:'Asia/Jakarta' })

    const _visibleCats = Object.keys(_mcAllCats).filter(k => !(_mcAllCats[k].ownerOnly && !isOwner))
    let _total = 0
    for (const k of _visibleCats) _total += _mcAllCats[k].cmds.length

    let t = ''

t += `sᴇʟᴀᴍᴀᴛ ᴅᴀᴛᴀɴɢ ᴅɪ sɪᴍᴘʟᴇ ᴍᴇɴᴜ *ᴇʟᴀɪɴᴀ ᴛʜᴇ ᴘʀɪᴍᴀʀʏ*, ᴀᴋᴜ ᴀᴅᴀʟᴀʜ ʙᴏᴛ ʏᴀɴɢ ᴅɪʙᴜᴀᴛ ᴏʟᴇʜ *ғᴀʟʟᴢx ɪɴғɪɴɪᴛʏ*\n\n`

t += `┏━━━━━━━━━━━━━━━━━━━━\n`
t += `┃ こんにちは 👋\n`
t += `┃ ʜᴇʟʟᴏ ᴜsᴇʀs\n`
t += `┗━━━━━━━━━━━━━━━━━━━━\n\n`

t += `╭─〔 ɪɴғᴏʀᴍᴀsɪ 〕\n`
t += `│ 🤖  Bot      : ${_mBot}\n`
t += `│ 👑  Owner    : ${_mOwner}\n`
t += `│ ⌨️  Prefix   : ${prefix}\n`
t += `│ 📦  Command  : ${_total}\n`
t += `│ ⏱️  Uptime   : ${_mUpD}h ${_mUpH}j ${_mUpM}m\n`
t += `│ 🧠  RAM      : ${_mRam} MB\n`
t += `│ 🕐  Jam      : ${_mJam} WIB\n`
t += `│ 📅  Tanggal  : ${_mTgl}\n`
t += `╰───────────────⬣\n\n`

t += `> ɢᴜɴᴀᴋᴀɴ ʙᴏᴛ ᴅᴇɴɢᴀɴ ʙɪᴊᴀᴋ 💙\n`
    t += `\n`

    for (const k of _visibleCats) {
        const cat = _mcAllCats[k]
        t += `╭┈┈⬡「 ${cat.emoji} *${_toSmallCaps(cat.label)}* ❭  _${cat.cmds.length} cmd_\n`
        t += `┃ ≡ _${cat.desc}_\n`
        t += `┃\n`
        for (const cmd of cat.cmds) {
            t += `┃ • *${prefix}${cmd}*\n`
        }
        t += `╰┈┈┈┈┈┈┈┈⬡\n`
        t += `\n`
    }

    t += `> ✦ _Gunakan tombol di bawah untuk navigasi cepat_`
    return t
}

global.mainmenuButler = (prefix) => {
    const c = _mcAllCats.main
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.downloadmenuButler = (prefix) => {
    const c = _mcAllCats.download
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.hiburanmenuButler = (prefix) => {
    const c = _mcAllCats.hiburan
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.ttsmenuButler = (prefix) => {
    const c = _mcAllCats.tts
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.gamemenuButler = (prefix) => {
    const c = _mcAllCats.game
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.stalkermenuButler = (prefix) => {
    const c = _mcAllCats.stalker
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.cekmenuButler = (prefix) => {
    const c = _mcAllCats.cek
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.primbonmenuButler = (prefix) => {
    const c = _mcAllCats.primbon
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.audiomenuButler = (prefix) => {
    const c = _mcAllCats.audio
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.canvasmenuButler = (prefix) => {
    const c = _mcAllCats.canvas
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.ephotomenuButler = (prefix) => {
    const c = _mcAllCats.ephoto
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.religimenuButler = (prefix) => {
    const c = _mcAllCats.religi
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.usermenuButler = (prefix) => {
    const c = _mcAllCats.user
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.searchmenuButler = (prefix) => {
    const c = _mcAllCats.search
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.utilitymenuButler = (prefix) => {
    const c = _mcAllCats.utility
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.toolsmenuButler = (prefix) => {
    const c = _mcAllCats.tools
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.sewamenuButler = (prefix) => {
    const c = _mcAllCats.sewa
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.statistikmenuButler = (prefix) => {
    const c = _mcAllCats.statistik
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.aimenuButler = (prefix) => {
    const c = _mcAllCats.ai
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.aiimgmenuButler = (prefix) => {
    const c = _mcAllCats.aiimg
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.stickermenuButler = (prefix) => {
    const c = _mcAllCats.sticker
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.grupmenuButler = (prefix) => {
    const c = _mcAllCats.grup
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.proteksimenuButler = (prefix) => {
    const c = _mcAllCats.proteksi
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.securitymenuButler = (prefix) => {
    const c = _mcAllCats.security
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.doctormenuButler = (prefix) => {
    const c = _mcAllCats.doctor
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.rpgmenuButler = (prefix) => {
    const c = _mcAllCats.rpg
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

global.ownermenuButler = (prefix) => {
    const c = _mcAllCats.owner
    let t = `╭┈┈⬡「 ${c.emoji} *${_toSmallCaps(c.label)}* 」\n`
    t += `┃ _${c.desc}_\n┃\n`
    for (const cmd of c.cmds) t += `┃ • *${prefix}${cmd}*\n`
    t += `╰┈┈┈┈┈┈┈┈⬡`
    return t
}

async function sendAllMenu(bulter, m, prefix, pushname, isOwner, isCreator) {
    await bulter.sendMessage(m.chat, { react: { text: '⏳', key: m.key } })

    let _genMsg, _proto, _prepMedia
    try {
        const _bl  = require('@whiskeysockets/baileys')
        _genMsg    = _bl.generateWAMessageFromContent
        _proto     = _bl.proto
        _prepMedia = _bl.prepareWAMessageMedia
    } catch {}

    const _mBot      = global.namaBot     || 'Elaina The Primary'
    const _mSaluran  = global.linkSaluran || 'https://whatsapp.com/channel/'
    const _mOwnerNum = (global.owner?.[0] || global.nobot || '').replace(/[^0-9]/g, '')
    const _mOwnerWa  = `https://wa.me/${_mOwnerNum}`
    const _mNewsJid  = global.saluranId   || '120363208449943317@newsletter'
    const _mNewsName = global.saluranName || _mBot
    const _mThumbUrl = global.thumnail2   || 'https://files.catbox.moe/3dtxlc.jpg'

    let _mThumbBuf = null
    try {
        const r = await axios.get(_mThumbUrl, { responseType: 'arraybuffer', timeout: 8000 })
        _mThumbBuf = Buffer.from(r.data)
    } catch {}

    const _mText = global.allmenuButler(prefix, isOwner || isCreator)

    const _allCatRows = Object.keys(_mcAllCats)
        .filter(k => !(_mcAllCats[k].ownerOnly && !(isOwner || isCreator)))
        .map(k => ({
            header:      `${_mcAllCats[k].emoji} ${_mcAllCats[k].label}`,
            title:       _mcAllCats[k].desc,
            description: `${_mcAllCats[k].cmds.length} command tersedia`,
            id:          `${prefix}mcat ${k}`
        }))

    const _mQuoted = {
        key: { participant: `0@s.whatsapp.net`, remoteJid: `status@broadcast` },
        message: {
            contactMessage: {
                displayName: `📋 ${_mBot}`,
                vcard: `BEGIN:VCARD\nVERSION:3.0\nFN:${_mBot}\nitem1.TEL;waid=0:+0\nEND:VCARD`,
                sendEphemeral: true
            }
        }
    }

    const _mCtx = {
        mentionedJid: [m.sender],
        forwardingScore: 9999,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
            newsletterJid:   _mNewsJid,
            newsletterName:  _mNewsName,
            serverMessageId: 127
        },
        externalAdReply: {
            title:   `${_mBot} — All Command`,
            body:    `${_allCatRows.length} Kategori • ${new Date().toLocaleDateString('id-ID', { timeZone: 'Asia/Jakarta' })}`,
            mediaType: 1,
            showAdAttribution: false,
            renderLargerThumbnail: true,
            ...(_mThumbBuf ? { thumbnail: _mThumbBuf } : {}),
            sourceUrl: _mSaluran
        }
    }

    const _mButtons = [
        {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
        },
        {
            name: 'call_permission_request',
            buttonParamsJson: JSON.stringify({ has_multiple_buttons: true })
        },
        {
            name: 'single_select',
            buttonParamsJson: JSON.stringify({
                title: '📂 ᴊᴜᴍᴘ ᴋᴇ ᴋᴀᴛᴇɢᴏʀɪ',
                sections: [{
                    title: `✦ ${_allCatRows.length} ᴋᴀᴛᴇɢᴏʀɪ ᴛᴇʀꜱᴇᴅɪᴀ`,
                    highlight_label: _mBot,
                    rows: _allCatRows
                }],
                has_multiple_buttons: true
            })
        },
        {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '🏠 ᴍᴇɴᴜ ᴜᴛᴀᴍᴀ', id: `${prefix}menu` })
        },
        {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '📊 sᴛᴀᴛᴜs ʙᴏᴛ', id: `${prefix}ping` })
        },
        {
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '💰 ɪɴꜰᴏ ꜱᴇᴡᴀ', id: `${prefix}ceksewa` })
        },
        {
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📢 ꜱᴀʟᴜʀᴀɴ ʀᴇꜱᴍɪ',
                url: _mSaluran,
                merchant_url: _mSaluran
            })
        },
        ...(_mOwnerNum ? [{
            name: 'cta_url',
            buttonParamsJson: JSON.stringify({
                display_text: '📞 ʜᴜʙᴜɴɢɪ ᴏᴡɴᴇʀ',
                url: _mOwnerWa,
                merchant_url: _mOwnerWa
            })
        }] : []),
        {
            name: 'cta_copy',
            buttonParamsJson: JSON.stringify({
                display_text: '⎙ ᴅᴇᴠ: ғᴀʟʟᴢx ɪɴғɪɴɪᴛʏ',
                copy_code: 'FallZx Infinity'
            })
        },
        ...(isOwner || isCreator ? [{
            name: 'quick_reply',
            buttonParamsJson: JSON.stringify({ display_text: '👑 ᴘᴀɴᴇʟ ᴏᴡɴᴇʀ', id: `${prefix}mcat owner` })
        }] : [])
    ]

    const _mFlowParams = JSON.stringify({
        bottom_sheet: {
            in_thread_buttons_limit: 2,
            divider_indices: [2, 3, 4, 5, 6, 7, 8, 999],
            list_title: '📂 ᴊᴜᴍᴘ ᴋᴇ ᴋᴀᴛᴇɢᴏʀɪ',
            button_title: '✦ ᴊᴇʟᴀᴊᴀʜɪ ꜱᴇᴍᴜᴀ ꜰɪᴛᴜʀ'
        }
    })

    const _mFooter = global.Foah || `✦ ${_mBot}`

    if (_genMsg && _prepMedia && _mThumbBuf) {
        try {
            const _mMediaPrep = await _prepMedia(
                { image: _mThumbBuf },
                { upload: bulter.waUploadToServer }
            )
            const _mProto = {
                viewOnceMessage: {
                    message: {
                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                        interactiveMessage: {
                            header: {
                                hasMediaAttachment: true,
                                imageMessage: _mMediaPrep.imageMessage
                            },
                            body:   { text: _mText },
                            footer: { text: _mFooter },
                            contextInfo: {
                                mentionedJid: [m.sender],
                                forwardingScore: 999,
                                isForwarded: true,
                                forwardedNewsletterMessageInfo: {
                                    newsletterJid:   _mNewsJid,
                                    newsletterName:  _mNewsName,
                                    serverMessageId: 127
                                }
                            },
                            nativeFlowMessage: {
                                messageParamsJson: _mFlowParams,
                                buttons: _mButtons
                            }
                        }
                    }
                }
            }
            const _built = _genMsg(m.chat, _mProto, { quoted: _mQuoted })
            await bulter.relayMessage(m.chat, _built.message, { messageId: _built.key.id })
            await bulter.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
            return
        } catch {}
    }

    try {
        if (!_genMsg) throw new Error('no genMsg')
        const _mProto2 = {
            viewOnceMessage: {
                message: {
                    messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                    interactiveMessage: {
                        header: { hasMediaAttachment: false },
                        body:   { text: _mText },
                        footer: { text: _mFooter },
                        contextInfo: {
                            mentionedJid: [m.sender],
                            forwardingScore: 999,
                            isForwarded: true,
                            forwardedNewsletterMessageInfo: {
                                newsletterJid:   _mNewsJid,
                                newsletterName:  _mNewsName,
                                serverMessageId: 127
                            }
                        },
                        nativeFlowMessage: {
                            messageParamsJson: _mFlowParams,
                            buttons: _mButtons
                        }
                    }
                }
            }
        }
        const _built2 = _genMsg(m.chat, _mProto2, { quoted: _mQuoted })
        await bulter.relayMessage(m.chat, _built2.message, { messageId: _built2.key.id })
    } catch {
        try {
            await bulter.sendMessage(m.chat, {
                image: _mThumbBuf || { url: _mThumbUrl },
                caption: _mText,
                mimetype: 'image/jpeg',
                contextInfo: _mCtx
            }, { quoted: _mQuoted })
        } catch {
            await bulter.sendMessage(m.chat, {
                text: _mText,
                contextInfo: _mCtx
            }, { quoted: _mQuoted })
        }
    }

    await bulter.sendMessage(m.chat, { react: { text: '✅', key: m.key } })
}

module.exports = { _mcAllCats, sendAllMenu }

let file = require.resolve(__filename)
fs.watchFile(file, () => {
    fs.unwatchFile(file)
    console.log(`Update ${__filename}`)
    delete require.cache[file]
    require(file)
})