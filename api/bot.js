const { Telegraf, Markup } = require('telegraf');
const chromium = require('@sparticuz/chromium');
const puppeteer = require('puppeteer-core');

// Configuration
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const BASE_URL = 'https://lokayafx.github.io/Free-editing-main';

const LOGO_SYSTEMS = [
    { id: '1', name: 'Logo 1' },
    { id: '2', name: 'Logo 2' },
    { id: '3', name: 'Logo 3' }
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

const bot = new Telegraf(BOT_TOKEN);
const userState = new Map();

async function renderPhotopea(templateId, data) {
    const template = TEMPLATES[templateId];
    if (!template) return null;
    let browser = null;
    try {
        browser = await puppeteer.launch({
            args: [...chromium.args, "--no-sandbox", "--disable-setuid-sandbox"],
            executablePath: await chromium.executablePath(),
            headless: chromium.headless,
        });
        const page = await browser.newPage();
        await page.setViewport({ width: 1000, height: 1000 });
        await page.goto('https://www.photopea.com', { waitUntil: 'networkidle2', timeout: 60000 });

        const result = await page.evaluate(async (psdUrl, fonts, layers, inputs) => {
            return new Promise((resolve, reject) => {
                const timeout = setTimeout(() => reject('Generation Timed Out in Photopea'), 45000);

                window.addEventListener("message", (e) => {
                    if (e.data instanceof ArrayBuffer) {
                        clearTimeout(timeout);
                        resolve(Array.from(new Uint8Array(e.data)));
                    }
                    if (typeof e.data === 'string' && e.data.includes("Error:")) {
                        clearTimeout(timeout);
                        reject(e.data);
                    }
                });

                async function run() {
                    try {
                        for (const f of fonts) {
                            const r = await fetch(f);
                            window.postMessage(await r.arrayBuffer(), "*");
                        }
                        const p = await fetch(psdUrl);
                        window.postMessage(await p.arrayBuffer(), "*");

                        setTimeout(() => {
                            const script = `
                                try {
                                    var doc = app.activeDocument;
                                    function set(lrs, n, t) {
                                        if(!t) return false;
                                        for(var i=0; i<lrs.length; i++){
                                            var l = lrs[i];
                                            if(l.name == n && l.kind == LayerKind.TEXT){
                                                l.textItem.contents = t;
                                                return true;
                                            }
                                            if(l.typename == "LayerSet") {
                                                if(set(l.layers, n, t)) return true;
                                            }
                                        }
                                        return false;
                                    }
                                    set(doc.layers, "${layers.name}", "${inputs.name}");
                                    set(doc.layers, "${layers.number}", "${inputs.number}");
                                    set(doc.layers, "${layers.title}", "${inputs.title}");
                                    doc.saveToOE("jpg", 90);
                                } catch(e) { app.echoToOE("Error: " + e.toString()); }
                            `;
                            window.postMessage(script, "*");
                        }, 5000); // Wait 5s for PSD to load
                    } catch (err) { reject(err.toString()); }
                }
                run();
            });
        }, template.psdUrl, template.fonts, template.targetLayers, data);
        return Buffer.from(result);
    } finally { if (browser) await browser.close(); }
}

bot.start((ctx) => {
    userState.delete(ctx.from.id);
    ctx.reply('🎨 Choose an option to start:', Markup.inlineKeyboard([
        [Markup.button.callback('🖼️ Generate Logo', 'start_logo')]
    ]));
});

bot.action('start_logo', (ctx) => {
    ctx.answerCbQuery();
    ctx.reply('👇 SELECT A LOGO SYSTEM:', Markup.inlineKeyboard([
        LOGO_SYSTEMS.map(s => Markup.button.callback(`Logo ${s.id}`, `sys_${s.id}`))
    ]));
});

bot.action(/^sys_(\d)$/, (ctx) => {
    const sysId = ctx.match[1];
    ctx.answerCbQuery();
    const buttons = [];
    for (let i = 1; i <= 9; i += 3) {
        buttons.push([
            Markup.button.callback(`Char ${i}`, `char_${sysId}_${i}`),
            Markup.button.callback(`Char ${i + 1}`, `char_${sysId}_${i + 1}`),
            Markup.button.callback(`Char ${i + 2}`, `char_${sysId}_${i + 2}`)
        ]);
    }
    ctx.reply(`🔽 SELECT A CHARACTER FOR LOGO ${sysId}:`, Markup.inlineKeyboard(buttons));
});

bot.action(/^char_(\d)_(\d)$/, (ctx) => {
    const [, sysId, charId] = ctx.match;
    userState.set(ctx.from.id, { step: 'WAITING_INPUT', templateId: `logo${sysId}_c${charId}` });
    ctx.answerCbQuery();
    const sampleText = "LOKAYA FX, 076 880 3361, GAMING EDITOR";
    ctx.reply(`Selected Logo ${sysId} Char ${charId}! Send details as:\n\n` +
        `\`${sampleText}\``, { parse_mode: 'Markdown' });
});

bot.on('text', async (ctx) => {
    const state = userState.get(ctx.from.id);
    if (!state || state.step !== 'WAITING_INPUT') return;

    const parts = ctx.message.text.split(',').map(p => p.trim());
    const data = { name: parts[0] || '', number: parts[1] || '', title: parts[2] || '' };

    userState.delete(ctx.from.id);
    await ctx.reply('🚀 Generating... Please wait (30-40s)');
    await ctx.sendChatAction('upload_photo');

    try {
        const buf = await renderPhotopea(state.templateId, data);
        if (buf) await ctx.replyWithPhoto({ source: buf }, { caption: `✅ Done! Name: ${data.name}` });
    } catch (e) {
        await ctx.reply('❌ Error: ' + e.toString());
    }
});

module.exports = async (req, res) => {
    try {
        if (req.method === 'POST') await bot.handleUpdate(req.body, res);
        else res.status(200).send('Bot Live');
    } catch (e) { res.status(500).send('Err'); }
};
