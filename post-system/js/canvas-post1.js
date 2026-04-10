/**
 * Post #1 - Account Store Canvas Renderer
 * Lokaya gFx - Canvas-based post generation
 */

// Canvas setup
const canvas = document.getElementById('postCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 1080;
canvas.height = 1080;

// Post configuration
const POST_CONFIG = {
    canvasSize: { width: 1080, height: 1080 },
    
    // Text layers
    layers: {
        topName: {
            x: 550.0,
            y: 117.0,
            width: 480.5,
            height: 63.7,
            rotation: -1.0,     // degrees
            skew: 0.0,          // degrees
            color: '#ffffff',   // White
            fontSize: 100,
            fontFamily: 'Progressive Soul, Impact, Arial Black, sans-serif',
            fontWeight: 'bold',
            fontStyle: 'normal',
            align: 'left',
            baseline: 'top'
        },
        
        bottomName: {
            x: 555.0,          // Slightly offset for shadow
            y: 125.0,          // Slightly offset for shadow
            width: 475.5,
            height: 63,
            rotation: -1.0,     // Same as top
            skew: 0.0,          // Same as top
            color: '#000000',   // Black (shadow effect)
            fontSize: 100,
            fontFamily: 'Progressive Soul, Impact, Arial Black, sans-serif',
            fontWeight: 'bold',
            fontStyle: 'normal',
            align: 'left',
            baseline: 'top'
        },
        
        number: {
            x: 572.1,
            y: 940,
            width: 213.8,
            height: 33.9,
            rotation: 0,        // No rotation
            skew: 0,            // No skew
            color: '#000000',   // Black
            fontSize: 50,
            fontFamily: 'Impact, Arial Black, sans-serif',
            fontWeight: 'bold',
            align: 'left',
            baseline: 'top'
        }
    },
    
    // Background image
    backgroundUrl: '../post1/pngs/acc_store_post.png'
};

/**
 * Draw text with transformation
 */
function drawTransformedText(text, layer) {
    ctx.save();
    
    // Move to position
    ctx.translate(layer.x, layer.y);
    
    // Apply rotation (if any)
    if (layer.rotation !== 0) {
        ctx.rotate((layer.rotation * Math.PI) / 180);
    }
    
    // Apply skew (if any)
    if (layer.skew !== 0) {
        // Skew transformation: horizontal skew
        const skewRad = (layer.skew * Math.PI) / 180;
        ctx.transform(1, 0, Math.tan(skewRad), 1, 0, 0);
    }
    
    // Set text style
    ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
    ctx.fillStyle = layer.color;
    ctx.textAlign = layer.align;
    ctx.textBaseline = layer.baseline;
    
    // Draw text
    ctx.fillText(text, 0, 0);
    
    ctx.restore();
}

/**
 * Generate post with user data
 */
async function generatePost(data) {
    try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Try to load background, but continue if it fails
        try {
            const bgImage = await loadImage(POST_CONFIG.backgroundUrl);
            ctx.drawImage(bgImage, 0, 0, canvas.width, canvas.height);
        } catch (bgError) {
            console.warn('Background image failed to load, using solid color:', bgError);
            // Fallback: dark background
            ctx.fillStyle = '#0a0a0f';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        // Draw top name (white)
        if (data.name1) {
            drawTransformedText(data.name1, POST_CONFIG.layers.topName);
        }
        
        // Draw bottom name (black)
        if (data.name2) {
            drawTransformedText(data.name2, POST_CONFIG.layers.bottomName);
        }
        
        // Draw number (black)
        if (data.number) {
            drawTransformedText(data.number, POST_CONFIG.layers.number);
        }
        
        // Export as PNG
        return canvas.toDataURL('image/png');
        
    } catch (error) {
        console.error('Error generating post:', error);
        throw error;
    }
}

/**
 * Load image helper
 */
function loadImage(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        
        img.src = url;
    });
}

/**
 * Download generated post
 */
function downloadPost(dataURL, filename) {
    const link = document.createElement('a');
    link.download = filename || 'post.png';
    link.href = dataURL;
    link.click();
}

/**
 * Main rendering function (called from rendering page)
 */
async function renderPost(userData) {
    try {
        console.log('=== POST GENERATION START ===');
        console.log('User Data:', userData);
        console.log('Canvas:', canvas);
        console.log('Canvas Size:', canvas.width, 'x', canvas.height);
        
        // Show loading
        console.log('Generating post...');
        
        // Generate post
        const imageData = await generatePost(userData);
        console.log('Post generated! Data URL length:', imageData.length);
        
        // Download
        const filename = `${userData.name1 || 'Post'}_AccountStore.png`;
        console.log('Downloading as:', filename);
        downloadPost(imageData, filename);
        
        console.log('=== POST GENERATION SUCCESS ===');
        return true;
        
    } catch (error) {
        console.error('=== POST GENERATION FAILED ===');
        console.error('Error:', error);
        console.error('Stack:', error.stack);
        return false;
    }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { renderPost, generatePost };
}
