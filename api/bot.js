const { Telegraf, Markup } = require('telegraf');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = 'https://lokayafx.github.io/Free-editing-main';

const LOGO_SYSTEMS = [
    { id: '1', name: 'Phantom Elite', preview: `${BASE_URL}/assets/logos/s1_c1.png` },
    { id: '2', name: 'Crimson Fury', preview: `${BASE_URL}/assets/logos/s2_c1.png` },
    { id: '3', name: 'Frost Vyper', preview: `${BASE_URL}/assets/logos/s3_c1.png` }
];

const TEMPLATES = {};
for (let s = 1; s <= 3; s++) {
    for (let c = 1; c <= 9; c++) {
        TEMPLATES[`logo${s}_c${c}`] = {
            id: `${s}_${c}`,
            name: `Logo ${s} - Char ${c}`,
            psdUrl: `${BASE_URL}/logo-system/logo${s}-char/char${c}/psd/s${s}_c${c}.psd`,
            fonts: [`${BASE_URL}/assets/Muro.otf`],
            targetLayers: { name: 'LogoName', number: 'LogoNumber', title: 'LogoTitel' }
        };
    }
}

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);
const userState = new Map();

// Helper: Process Rendering
async function renderPhotopea(templateId, data) {
    const template = TEMPLATES[templateId];
    if(!template) return null;
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: chromium.args,
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1000, height: 1000 });
        await page.goto('https://www.photopea.com', { waitUntil: 'networkidle2' });

        const result = await page.evaluate(async (psdUrl, fonts, layers, inputs) => {
            return new Promise((resolve, reject) => {
                window.addEventListener("message", (e) => {
                    if (e.data instanceof ArrayBuffer) resolve(Array.from(new Uint8Array(e.data)));
                    if (typeof e.data === 'string' && e.data.includes("Error:")) reject(e.data);
                });

                async function run() {
                    for (const f of fonts) {
                        try { const r = await fetch(f); window.postMessage(await r.arrayBuffer(), "*"); } catch(e) {}
                    }
                    try { const p = await fetch(psdUrl); window.postMessage(await p.arrayBuffer(), "*"); } catch(e) {}

                    setTimeout(() => {
                        const script = `
                            var doc = app.activeDocument;
                            function set(n, t) {
                                if(!t) return;
                                for(var i=0; i<doc.layers.length; i++){
                                    if(doc.layers[i].name==n && doc.layers[i].kind==LayerKind.TEXT){
                                        doc.layers[i].textItem.contents = t;
                                        return;
                                    }
                                    if(doc.layers[i].typename == "LayerSet"){
                                        var sub = doc.layers[i].layers;
                                        for(var j=0; j<sub.length; j++){
                                            if(sub[j].name==n && sub[j].kind==LayerKind.TEXT){
                                                sub[j].textItem.contents = t;
                                                return;
                                            }
                                        }
                                    }
                                }
                            }
                            set("${layers.name}", "${inputs.name}");
                            set("${layers.number}", "${inputs.number}");
                            set("${layers.title}", "${inputs.title}");
                            doc.saveToOE("jpg", 90);
                        `;
                        window.postMessage(script, "*");
                    }, 4000);
                }
                run();
            });
        }, template.psdUrl, template.fonts, template.targetLayers, data);
        return Buffer.from(result);
    } finally { if(browser) await browser.close(); }
}

// Bot Logic
bot.start((ctx) => {
    userState.delete(ctx.from.id);
    ctx.reply('🎨 Welcome! Choose an option to start:', Markup.inlineKeyboard([
        [Markup.button.callback('🖼️ Generate Logo', 'start_logo')],
        [Markup.button.callback('📝 Generate Post', 'start_post')]
    ]));
});

// Logo Flow
bot.action('start_logo', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Loading Logo Systems...');
    await ctx.sendChatAction('upload_photo');
    
    const media = LOGO_SYSTEMS.map(s => ({ type: 'photo', media: s.preview, caption: s.name }));
    await ctx.replyWithMediaGroup(media);
    
    await ctx.reply('👇 SELECT A LOGO SYSTEM:', Markup.inlineKeyboard([
        LOGO_SYSTEMS.map(s => Markup.button.callback(`Logo ${s.id}`, `sys_${s.id}`))
    ]));
});

bot.action(/^sys_(\d)$/, async (ctx) => {
    const sysId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply('⏳ Loading Character variations...');
    await ctx.sendChatAction('upload_photo');
    
    const media = [];
    for (let i = 1; i <= 9; i++) {
        media.push({ 
            type: 'photo', 
            media: `${BASE_URL}/logo-system/logo${sysId}-char/char${i}/s${sysId}_c${i}.webp`
        });
    }
    await ctx.replyWithMediaGroup(media);
    
    const buttons = [];
    for (let i = 1; i <= 9; i+=3) {
        buttons.push([
            Markup.button.callback(`Char ${i}`, `char_${sysId}_${i}`),
            Markup.button.callback(`Char ${i+1}`, `char_${sysId}_${i+1}`),
            Markup.button.callback(`Char ${i+2}`, `char_${sysId}_${i+2}`)
        ]);
    }
    
    await ctx.reply(`✅ System ${sysId} loaded! SELECT A CHARACTER:`, Markup.inlineKeyboard(buttons));
});

bot.action(/^char_(\d)_(\d)$/, async (ctx) => {
    const [, sysId, charId] = ctx.match;
    userState.set(ctx.from.id, { step: 'WAITING_INPUT', templateId: `logo${sysId}_c${charId}` });
    await ctx.answerCbQuery();
    
    const sampleText = "LOKAYA FX, 076 880 3361, GAMING EDITOR";
    await ctx.reply(`Selected Char ${charId}! Now send your details in this format:\n\n` +
                    `\`${sampleText}\` \n\n` +
                    `*(Copy, paste and edit the text above)*`, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'WAITING_INPUT') return;

    const parts = ctx.message.text.split(',').map(p => p.trim());
    if (parts.length < 1) return ctx.reply('Please send at least a Name.');

    const data = {
        name: parts[0] || '',
        number: parts[1] || '',
        title: parts[2] || ''
    };

    userState.delete(ctx.from.id);
    const prog = await ctx.reply('🚀 Generating your logo... Please wait around 20s.');
    await ctx.sendChatAction('upload_photo');

    try {
        const buf = await renderPhotopea(state.templateId, data);
        if(buf) {
            await ctx.replyWithPhoto({ source: buf }, { caption: `✅ Successfully Generated! \nName: ${data.name}` });
        } else {
            throw new Error('No buffer returned');
        }
    } catch (e) {
        console.error(e);
        await ctx.reply('❌ Error generating image. Please try again or check your text.');
    }
});

// Vercel Export
module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') await bot.handleUpdate(req.body, res);
        else res.status(200).send('Bot Active.');
    } catch(e) { console.error(e); res.status(500).send('Internal Error'); }
};
