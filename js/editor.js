// ========================
// SIMPLE SINGLE LOGO SYSTEM (s1_c1 only)
// With Rendering Page Redirect
// ========================

console.log('✅ Simple Logo Maker Loaded - s1_c1 only with rendering page');

// ========================
// NAVIGATION
// ========================
window.revealEditor = function() {
    const homeInput = document.getElementById('home-name');
    const targetInput = document.getElementById('target-name');
    const editorSection = document.getElementById('editor-section');
    
    if (!homeInput || !homeInput.value.trim()) {
        alert("Please enter a name!");
        return;
    }

    targetInput.value = homeInput.value.trim();
    
    // Show editor
    editorSection.classList.remove('hidden-section');
    editorSection.style.display = 'flex';
    
    // Hide home
    const homeSection = document.querySelector('.bg-premium-dark');
    if (homeSection) homeSection.style.display = 'none';

    setTimeout(() => {
        editorSection.scrollIntoView({ behavior: 'smooth' });
    }, 100);
};

// ========================
// LOGO GENERATION - REDIRECT TO RENDER PAGE
// ========================
window.generateFinalLogo = function() {
    const name = (document.getElementById('target-name').value || 'PLAYER').toUpperCase();
    const number = document.getElementById('target-number').value || '';
    const title = (document.getElementById('target-title').value || 'LEGEND').toUpperCase();
    
    console.log('🎯 Redirecting to render page');
    console.log('📝 Data:', { name, number, title });
    
    // Build URL with parameters (s1_c1 hardcoded)
    const params = new URLSearchParams({
        name: name,
        number: number,
        title: title
    });
    
    const renderUrl = './rendering/?' + params.toString();
    console.log('🔗 Redirect URL:', renderUrl);
    
    // Redirect to rendering page
    window.location.href = renderUrl;
};

// ========================
// COMING SOON
// ========================
window.showComingSoon = () => { 
    const layer = document.getElementById('coming-soon-layer');
    if (layer) layer.style.display = 'flex';
};

window.hideComingSoon = () => { 
    const layer = document.getElementById('coming-soon-layer');
    if (layer) layer.style.display = 'none';
};

// ========================
// SCROLL HEADER
// ========================
window.onscroll = function() {
    const slimHeader = document.getElementById("slim-header");
    if (slimHeader) {
        if (window.pageYOffset > 100) {
            slimHeader.classList.add("visible");
        } else {
            slimHeader.classList.remove("visible");
        }
    }
};

console.log('📜 Simple logo maker ready - s1_c1 with rendering page!');
