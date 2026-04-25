/**
 * Photopea API integration for Logo 3 (all characters)
 * Pattern based on post-system photopea approach.
 */

class PhotopeaLogoRenderer {
    constructor() {
        this.iframe = null;
        this.ppWindow = null;
        this.appReady = false;
        this.documentReady = false;
        this.onExportComplete = null;
        this.onError = null;
    }

    init() {
        return new Promise((resolve) => {
            if (this.iframe) {
                if (this.appReady) return resolve(true);
            }

            this.iframe = document.createElement('iframe');
            this.iframe.id = 'photopea-app';
            this.iframe.src = 'https://www.photopea.com';
            this.iframe.style.position = 'absolute';
            this.iframe.style.left = '-9999px';
            this.iframe.style.width = '1000px';
            this.iframe.style.height = '1000px';
            document.body.appendChild(this.iframe);

            this.ppWindow = this.iframe.contentWindow;

            window.addEventListener('message', (e) => {
                if (e.source !== this.ppWindow) return;

                if (e.data === 'done') {
                    if (!this.appReady) {
                        console.log('Photopea API ready.');
                        this.appReady = true;
                        resolve(true);
                    } else {
                        console.log('Photopea document loaded.');
                        this.documentReady = true;
                    }
                } else if (e.data instanceof ArrayBuffer || typeof e.data?.byteLength !== 'undefined') {
                    console.log('Received PNG export from Photopea.');
                    if (this.onExportComplete) this.onExportComplete(e.data);
                } else {
                    console.log('Photopea msg:', e.data);
                    if (typeof e.data === 'string' && e.data.includes('Error:') && this.onError) {
                        this.onError(e.data);
                    }
                }
            });
        });
    }

    async loadResource(url, isFont = false) {
        this.documentReady = false;
        console.log('Fetching:', url);

        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status} - ${url}`);

        const buffer = await response.arrayBuffer();
        console.log(`Sending ${isFont ? 'font' : 'PSD'} to Photopea (${buffer.byteLength} bytes)`);
        this.ppWindow.postMessage(buffer, '*');

        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (this.documentReady) {
                    clearInterval(interval);
                    resolve(true);
                }
            }, 200);
        });
    }

    executeScriptAndExport(data) {
        return new Promise((resolve, reject) => {
            this.onExportComplete = resolve;
            this.onError = reject;

            const safeName   = (data.name   || '').replace(/["'\\]/g, '');
            const safeNumber = (data.number || '').replace(/["'\\]/g, '');
            const safeTitle  = (data.title  || '').replace(/["'\\]/g, '');

            const script = `
                app.echoToOE("Logo script start");
                try {
                    var doc = app.activeDocument;

                    function setLayerText(layers, layerName, newText) {
                        for (var i = 0; i < layers.length; i++) {
                            var l = layers[i];
                            if (l.name === layerName && l.kind == LayerKind.TEXT) {
                                doc.activeLayer = l;
                                doc.activeLayer.textItem.contents = newText;
                                app.echoToOE("Updated: " + layerName);
                                return true;
                            }
                            if (l.typename === "LayerSet") {
                                if (setLayerText(l.layers, layerName, newText)) return true;
                            }
                        }
                        return false;
                    }

                    if ("${safeName}")   setLayerText(doc.layers, "LogoName",   "${safeName}");
                    if ("${safeNumber}") setLayerText(doc.layers, "LogoNumber", "${safeNumber}");
                    if ("${safeTitle}")  setLayerText(doc.layers, "LogoTitel",  "${safeTitle}");

                    app.echoToOE("Exporting PNG...");
                    doc.saveToOE("png");
                    app.echoToOE("Done.");
                } catch(e) {
                    app.echoToOE("Error: " + e.toString());
                }
            `;

            console.log('Sending script to Photopea...');
            this.ppWindow.postMessage(script, '*');
        });
    }
}

const renderer = new PhotopeaLogoRenderer();

async function renderLogo(userData) {
    try {
        console.log('=== LOGO 3 GENERATION START ===', userData);

        await renderer.init();
        console.log('Photopea loaded.');

        // Load Muro.otf font
        const fontUrl = '../assets/Muro.otf';
        try {
            console.log('Loading Muro.otf font...');
            await renderer.loadResource(fontUrl, true);
            console.log('Muro.otf font loaded.');
        } catch (fontErr) {
            console.warn('Muro.otf failed to load (continuing):', fontErr);
        }

        // Build PSD path
        const charN  = userData.char || '1';
        const psdUrl = `../logo3-char/char${charN}/psd/s3_c${charN}.psd`;
        console.log('PSD path:', psdUrl);

        await renderer.loadResource(psdUrl, false);
        console.log('PSD loaded. Sending script...');

        const imageBuffer = await renderer.executeScriptAndExport(userData);

        const blob = new Blob([imageBuffer], { type: 'image/png' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.style.display = 'none';
        a.href     = url;
        a.download = `lokaya-logo3-c${charN}.png`;
        document.body.appendChild(a);
        a.click();
        
        // Delay revocation
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);

        console.log('=== LOGO 3 GENERATION DONE ===');
        return true;
    } catch (err) {
        console.error('=== LOGO 3 GENERATION FAILED ===', err);
        return false;
    }
}

window.renderLogo = renderLogo;
