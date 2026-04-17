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
// Pre-generate templates for logic
for (let s = 1; s <= 3; s++) {
    for (let c = 1; c <= 9; c++) {
        TEMPLATES[`logo${s}_c${c}`] = {
            psdUrl: `${BASE_URL}/logo-system/logo${s}-char/char${c}/psd/s${s}_c${c}.psd`,
            fonts: [`${BASE_URL}/assets/Muro.otf`],
            targetLayers: { name: 'LogoName', number: 'LogoNumber', title: 'LogoTitel' }
        };
    }
}

// Map for Post System (Simplified for now)
TEMPLATES['post1'] = {
    name: 'Account Store',
    psdUrl: `${BASE_URL}/post-system/post1/psd/store%20post.psd`,
    fonts: [`${BASE_URL}/assets/fonts/PROGRESSIVE%20SOUL.ttf`],
    targetLayers: { name: 'name', number: 'number' }
};

// Initialize Bot
const bot = new Telegraf(BOT_TOKEN);
const userState = new Map();

// Helper: Process Rendering
async function renderPhotopea(templateId, data) {
    const template = TEMPLATES[templateId];
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: [...chromium.args, "--no-sandbox"],
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.goto('https://www.photopea.com', { waitUntil: 'networkidle2' });

        const result = await page.evaluate(async (psdUrl, fonts, layers, inputs) => {
            return new Promise((resolve, reject) => {
                window.addEventListener("message", (e) => {
                    if (e.data instanceof ArrayBuffer) resolve(Array.from(new Uint8Array(e.data)));
                    if (typeof e.data === 'string' && e.data.includes("Error:")) reject(e.data);
                });

                async function run() {
                    for (const f of fonts) {
                        const r = await fetch(f);
                        window.postMessage(await r.arrayBuffer(), "*");
                    }
                    const p = await fetch(psdUrl);
                    window.postMessage(await p.arrayBuffer(), "*");

                    setTimeout(() => {
                        const script = `
                            var doc = app.activeDocument;
                            function set(n, t) {
                                for(var i=0; i<doc.layers.length; i++){
                                    if(doc.layers[i].name==n && doc.layers[i].kind==LayerKind.TEXT){
                                        doc.layers[i].textItem.contents = t;
                                    }
                                }
                            }
                            if("${inputs.name}") set("${layers.name}", "${inputs.name}");
                            if("${inputs.number}") set("${layers.number}", "${inputs.number}");
                            if("${inputs.title}") set("${layers.title}", "${inputs.title}");
                            doc.saveToOE("png");
                        `;
                        window.postMessage(script, "*");
                    }, 3000);
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
    ctx.reply('Welcome to Lokaya Gfx! Choose an option:', Markup.inlineKeyboard([
        [Markup.button.callback('🎨 Generate Logo', 'start_logo')],
        [Markup.button.callback('📝 Generate Post', 'start_post')]
    ]));
});

// Logo Flow
bot.action('start_logo', async (ctx) => {
    await ctx.answerCbQuery();
    await ctx.reply('Choose a Logo System:');
    for (const sys of LOGO_SYSTEMS) {
        await ctx.replyWithPhoto(sys.preview, {
            caption: `System: ${sys.name}`,
            ...Markup.inlineKeyboard([Markup.button.callback(`Select ${sys.name}`, `sys_${sys.id}`)])
        });
    }
});

bot.action(/^sys_(\d)$/, async (ctx) => {
    const sysId = ctx.match[1];
    await ctx.answerCbQuery();
    await ctx.reply(`System ${sysId} Characters:`);
    
    const media = [];
    for (let i = 1; i <= 9; i++) {
        media.push({ type: 'photo', media: `${BASE_URL}/logo-system/logo${sysId}-char/char${i}/s${sysId}_c${i}.webp` });
    }
    await ctx.replyWithMediaGroup(media);
    
    // Buttons in grid
    for (let i = 1; i <= 9; i+=3) {
        buttons.push([
            Markup.button.callback(`Char ${i}`, `char_${sysId}_${i}`),
            Markup.button.callback(`Char ${i+1}`, `char_${sysId}_${i+1}`),
            Markup.button.callback(`Char ${i+2}`, `char_${sysId}_${i+2}`)
        ]);
    }
    await ctx.reply('Select a character:', Markup.inlineKeyboard(buttons));
});

bot.action(/^char_(\d)_(\d)$/, async (ctx) => {
    const [, sysId, charId] = ctx.match;
    userState.set(ctx.from.id, { step: 'NAME', templateId: `logo${sysId}_c${charId}`, data: {} });
    await ctx.answerCbQuery();
    await ctx.reply('Great! Please enter the **NAME** for your logo:');
});

// Input handling logic
bot.on('text', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state) return;

    if (state.step === 'NAME') {
        state.data.name = ctx.message.text;
        state.step = 'NUMBER';
        await ctx.reply('Now enter the **NUMBER**:');
    } else if (state.step === 'NUMBER') {
        state.data.number = ctx.message.text;
        state.step = 'TITLE';
        await ctx.reply('Finally, enter the **UNDERNAME TITLE**:');
    } else if (state.step === 'TITLE') {
        state.data.title = ctx.message.text;
        state.step = 'PROCESSING';
        const prog = await ctx.reply('🎨 Processing... Please wait 20-30s.');
        
        try {
            const buf = await renderPhotopea(state.templateId, state.data);
            await ctx.replyWithPhoto({ source: buf }, { caption: '✅ Your elite logo is ready!' });
        } catch (e) {
            await ctx.reply('❌ Error generating image. Please try again.');
        }
        userState.delete(ctx.from.id);
    }
});

// Post Flow (Simple Placeholder)
bot.action('start_post', (ctx) => {
    ctx.answerCbQuery();
    userState.set(ctx.from.id, { step: 'NAME', templateId: 'post1', data: {} });
    ctx.reply('Generate Post selected. Enter the **NAME**:');
});

// Vercel Export
module.exports = async (req, res) => {
    if (req.method === 'POST') await bot.handleUpdate(req.body, res);
    else res.status(200).send('Bot is live.');
};
