/**
 * Photopea API integration for Post 2 (EZ Cash Details)
 */

class PhotopeaRenderer {
    constructor(iframeSrc = "https://www.photopea.com") {
        this.iframeSrc = iframeSrc;
        this.photopeaWindow = null;
        this.iframe = null;
        this.appReady = false;
        this.documentReady = false;

        this.onExportComplete = null;
        this.onError = null;
    }

    init() {
        return new Promise((resolve) => {
            this.iframe = document.createElement("iframe");
            this.iframe.id = "photopea-app";
            this.iframe.src = this.iframeSrc;
            this.iframe.style.position = "absolute";
            this.iframe.style.left = "-9999px";
            this.iframe.style.width = "1000px";
            this.iframe.style.height = "1000px";
            document.body.appendChild(this.iframe);

            this.photopeaWindow = this.iframe.contentWindow;

            window.addEventListener("message", (e) => {
                if (e.source !== this.photopeaWindow) return;

                if (e.data === "done") {
                    if (!this.appReady) {
                        console.log("Photopea API initialized.");
                        this.appReady = true;
                        resolve(true);
                    } else {
                        console.log("Photopea document loaded.");
                        this.documentReady = true;
                    }
                } else if (e.data instanceof ArrayBuffer || typeof e.data.byteLength !== 'undefined') {
                    console.log("Received exported PNG from Photopea.");
                    if (this.onExportComplete) {
                        this.onExportComplete(e.data);
                    }
                } else {
                    console.log("Photopea says:", e.data);
                    if (typeof e.data === 'string' && e.data.includes("Error:") && this.onError) {
                        this.onError(e.data);
                    }
                }
            });
        });
    }

    async loadResource(resourceUrl, isFont = false) {
        if (!this.appReady) await this.init();

        console.log(`Fetching resource from ${resourceUrl}...`);
        this.documentReady = false;

        try {
            const response = await fetch(resourceUrl);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const buffer = await response.arrayBuffer();
            console.log(`Resource downloaded. Sending ${isFont ? 'font' : 'document'} to Photopea...`);
            this.photopeaWindow.postMessage(buffer, "*");

            return new Promise((resolve) => {
                const interval = setInterval(() => {
                    if (this.documentReady) {
                        clearInterval(interval);
                        resolve(true);
                    }
                }, 200);
            });
        } catch (error) {
            console.error("Failed to load resource:", error);
            throw error;
        }
    }

    executeScriptAndExport(data) {
        return new Promise((resolve, reject) => {
            this.onExportComplete = resolve;
            this.onError = reject;

            const safeName = (data.name1 || 'LOKAYA').replace(/["'\\]/g, "");
            const safeNumber = (data.number || '076 880 3361').replace(/["'\\]/g, "");
            const safeNumberWa = (data.number_wa || '076 880 3361').replace(/["'\\]/g, "");

            const script = `
                app.echoToOE("Debug: Photopea script execution started");
                try {
                    var doc = app.activeDocument;
                    
                    function setLayerText(layers, name, newText) {
                        for (var i = 0; i < layers.length; i++) {
                            if (layers[i].name === name) {
                                app.echoToOE("Debug: Found layer by name: " + name);
                                if (layers[i].kind == LayerKind.TEXT) {
                                    app.echoToOE("Debug: Updating text using activeLayer: " + name);
                                    doc.activeLayer = layers[i];
                                    doc.activeLayer.textItem.contents = newText;
                                    app.echoToOE("Debug: Successfully updated: " + name);
                                    return true;
                                } else {
                                    app.echoToOE("Debug: Layer is not text, kind=" + layers[i].kind);
                                }
                            }
                            if (layers[i].typename === "LayerSet") {
                                if (setLayerText(layers[i].layers, name, newText)) return true;
                            }
                        }
                        return false;
                    }
                    
                    app.echoToOE("Debug: Setting name layer");
                    var nameSet = setLayerText(doc.layers, "name", "${safeName}");
                    app.echoToOE("Debug: name found? " + nameSet);
                    
                    app.echoToOE("Debug: Setting number layer");
                    var numberSet = setLayerText(doc.layers, "number", "${safeNumber}");
                    app.echoToOE("Debug: number found? " + numberSet);
                    
                    app.echoToOE("Debug: Setting number wa layer");
                    var numberWaSet = setLayerText(doc.layers, "number wa", "${safeNumberWa}");
                    app.echoToOE("Debug: number wa found? " + numberWaSet);
                    
                    app.echoToOE("Debug: Exporting to PNG");
                    doc.saveToOE("png");
                    app.echoToOE("Debug: Script finished perfectly");
                } catch (e) {
                    app.echoToOE("Error: " + e.toString());
                }
            `;

            console.log("Executing script in Photopea...");
            this.photopeaWindow.postMessage(script, "*");
        });
    }
}

const renderer = new PhotopeaRenderer();

async function renderPost(userData) {
    try {
        console.log('=== POST GENERATION START ===');

        // 1. Initialize API
        console.log("Initializing Photopea...");
        await renderer.init();

        // 2. Load custom fonts
        console.log("Loading Custom Fonts...");
        const isRendering = window.location.pathname.includes('rendering');
        const fontPath = isRendering ? '../assets/fonts/PROGRESSIVE%20SOUL.ttf' : '../assets/fonts/PROGRESSIVE%20SOUL.ttf';
        const impactPath = isRendering ? '../assets/fonts/impact.ttf' : '../assets/fonts/impact.ttf';
        const arialBlackPath = isRendering ? '../assets/fonts/Arial%20Black.ttf' : '../assets/fonts/Arial%20Black.ttf';
        
        try {
            await renderer.loadResource(fontPath, true);
        } catch (fontErr) {}
        try {
            await renderer.loadResource(impactPath, true);
        } catch (e) {}
        try {
            await renderer.loadResource(arialBlackPath, true);
        } catch(e) {}

        // 3. Load PSD file
        console.log("Loading PSD...");
        const postPsdPath = window.location.pathname.includes('rendering')
            ? '../post2/psd/ez_cash_post.psd'
            : './psd/ez_cash_post.psd';

        await renderer.loadResource(postPsdPath, false);

        // 4. Process the changes and get image buffer
        console.log("Updating text layers & exporting...");
        const imageBuffer = await renderer.executeScriptAndExport(userData);

        // 5. Trigger download
        const blob = new Blob([imageBuffer], { type: "image/png" });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `${userData.name1 || 'Post'}_EZCash.png`;
        link.click();

        console.log("Download triggered, cleaning up...");
        URL.revokeObjectURL(url);

        return true;
    } catch (error) {
        console.error('=== POST GENERATION FAILED ===', error);
        return false;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderPost, renderer };
}
