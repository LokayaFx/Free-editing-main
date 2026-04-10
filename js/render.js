// ========================
// SIMPLE RENDER PAGE (s1_c1 only)
// Exact copy from ff-logo-web working code
// ========================

console.log('🎬 Simple Render Page Loaded - s1_c1 only');

// Get URL parameters
const urlParams = new URLSearchParams(window.location.search);
const logoName = (urlParams.get('name') || 'LOKAYA GFX').toUpperCase();
const logoNumber = urlParams.get('number') || '';
const logoTitle = (urlParams.get('title') || '').toUpperCase();

console.log('📝 Parameters:', { logoName, logoNumber, logoTitle });

// Display info
document.getElementById('display-name').textContent = logoName;

// Elements
const statusEl = document.getElementById('status');
const progressFill = document.getElementById('progress-fill');
const percentageEl = document.getElementById('percentage');
const errorContainer = document.getElementById('error-container');
const errorMessage = document.getElementById('error-message');

// Progress animation
let progress = 0;
const progressInterval = setInterval(() => {
    progress += 1;
    if (progress > 95) progress = 95;
    progressFill.style.width = progress + '%';
    percentageEl.textContent = Math.floor(progress) + '%';
}, 200);

// Update status
function updateStatus(message) {
    statusEl.textContent = message;
    console.log('📢', message);
}

// Show error
function showError(message) {
    clearInterval(progressInterval);
    errorMessage.textContent = message;
    errorContainer.classList.add('active');
    document.querySelector('.spinner').style.display = 'none';
    document.getElementById('details').style.display = 'none';
}

// ========================
// PHOTOPEA INTEGRATION (EXACT FROM ff-logo-web)
// ========================

updateStatus('Loading PSD file...');

// HARDCODED s1_c1 - Direct GitHub URLs (same as ff-logo-web)
const psd = 'https://raw.githubusercontent.com/LokayaFx/Free-editing/main/assets/psds/s1_c1.psd';
const font = 'https://raw.githubusercontent.com/LokayaFx/Free-editing/main/assets/Muro.otf';

console.log('📄 PSD:', psd);
console.log('🔤 Font:', font);

updateStatus('Processing your logo...');

// EXACT script from ff-logo-web
const pScript = `
    app.loadFont('${font}');
    function process() {
        if(app.documents.length == 0) return;
        var doc = app.activeDocument;
        function setL(n, v) {
            try { doc.artLayers.getByName(n).textItem.contents = v; } catch(e) {}
        }
        setL('LogoName', '${logoName}');
        setL('LogoNumber', '${logoNumber}');
        setL('LogoTitel', '${logoTitle}');
        doc.saveToOE('png');
    }
    var checkLimit = 0;
    function checkReady() {
        if(app.fontsLoaded || checkLimit > 50) { process(); }
        else { checkLimit++; process(); }
    }
    checkReady();
`;

const config = { 
    "files": [psd, font], 
    "script": pScript, 
    "serverMode": true 
};

const iframe = document.createElement("iframe");
iframe.style.display = "none";
iframe.id = "photopea-iframe";
iframe.src = "https://www.photopea.com#" + encodeURI(JSON.stringify(config));
document.body.appendChild(iframe);

console.log('✅ Photopea iframe created');

// EXACT message handler from ff-logo-web
let downloadComplete = false;

window.addEventListener("message", function handle(e) {
    if (e.data instanceof ArrayBuffer) {
        console.log('🎉 PNG received! Size:', e.data.byteLength);
        
        downloadComplete = true;
        clearInterval(progressInterval);
        
        progressFill.style.width = '100%';
        percentageEl.textContent = '100%';
        updateStatus('Download complete!');
        
        const url = URL.createObjectURL(new Blob([e.data], {type: "image/png"}));
        const a = document.createElement("a");
        a.href = url;
        a.download = `Logo_${logoName}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        console.log('✅ Download triggered:', `Logo_${logoName}.png`);
        
        setTimeout(() => {
            URL.revokeObjectURL(url);
            const frame = document.getElementById('photopea-iframe');
            if (frame) document.body.removeChild(frame);
            window.removeEventListener("message", handle);
            
            updateStatus('Redirecting...');
            setTimeout(() => {
                window.location.href = '../';
            }, 1500);
        }, 1000);
    }
});

// Timeout (no timeout - like ff-logo-web, it just waits)
// But we add safety timeout
setTimeout(() => {
    if (!downloadComplete) {
        clearInterval(progressInterval);
        console.error('❌ Export timeout');
        
        const frame = document.getElementById('photopea-iframe');
        if (frame) document.body.removeChild(frame);
        
        showError(
            'The logo export timed out. This usually happens due to:\n\n' +
            '• Very slow internet connection\n' +
            '• PSD file loading issue\n\n' +
            'Please try again with a better connection.'
        );
    }
}, 120000); // 2 minutes safety timeout

console.log('🚀 Rendering process started - Exact ff-logo-web logic');
