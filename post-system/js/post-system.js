/**
 * Lokaya gFx - Post System Main JS
 * Handles navigation, animations, and utility functions
 */

// ===================================
// Configuration
// ===================================

const CONFIG = {
    posts: [
        {
            id: 'post1',
            title: 'Account Store Post',
            description: 'Professional account selling post template with customizable details',
            preview: 'assets/posts/preview1.webp',
            path: 'post1/index.html',
            category: 'business',
            badge: 'FREE',
            active: true
        },
        {
            id: 'post2',
            title: 'Membership Post',
            description: 'Squad recruitment and membership announcement template',
            preview: 'assets/posts/preview2.webp',
            path: 'post2/index.html',
            category: 'recruitment',
            badge: 'FREE',
            active: true
        },
        {
            id: 'post3',
            title: 'Custom Match Post',
            description: 'Create custom match announcements with prize details',
            preview: 'assets/posts/preview3.webp',
            path: 'post3/index.html',
            category: 'event',
            badge: 'FREE',
            active: true
        },
        {
            id: 'post4',
            title: 'Achievement Post',
            description: 'Showcase your wins and achievements with style',
            preview: 'assets/posts/preview4.webp',
            path: 'post4/index.html',
            category: 'achievement',
            badge: 'FREE',
            active: true
        },
        {
            id: 'post5',
            title: 'Quote Post',
            description: 'Motivational quotes with Free Fire background themes',
            preview: 'assets/posts/preview5.webp',
            path: 'post5/index.html',
            category: 'quote',
            badge: 'FREE',
            active: true
        }
    ],
    
    fallbackImage: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="400"%3E%3Crect fill="%230a0a0f" width="400" height="400"/%3E%3Ctext fill="%23ffffff" font-family="Arial" font-size="20" x="50%25" y="50%25" text-anchor="middle" dominant-baseline="middle"%3ENo Preview%3C/text%3E%3C/svg%3E'
};

// ===================================
// DOM Ready
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Lokaya gFx Post System - Loaded');
    
    initLazyLoading();
    initScrollAnimations();
    initNavigation();
    checkForUpdates();
});

// ===================================
// Lazy Loading for Images
// ===================================

function initLazyLoading() {
    const images = document.querySelectorAll('.post-preview img');
    
    if ('IntersectionObserver' in window) {
        const imageObserver = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    loadImage(img);
                    observer.unobserve(img);
                }
            });
        }, {
            rootMargin: '50px'
        });
        
        images.forEach(img => imageObserver.observe(img));
    } else {
        // Fallback for older browsers
        images.forEach(img => loadImage(img));
    }
}

function loadImage(img) {
    const src = img.getAttribute('src');
    
    // Create temporary image to test loading
    const tempImg = new Image();
    
    tempImg.onload = function() {
        img.src = src;
        img.style.opacity = '0';
        setTimeout(() => {
            img.style.transition = 'opacity 0.3s';
            img.style.opacity = '1';
        }, 10);
    };
    
    tempImg.onerror = function() {
        console.warn('Failed to load image:', src);
        img.src = CONFIG.fallbackImage;
        img.style.opacity = '1';
    };
    
    tempImg.src = src;
}

// ===================================
// Scroll Animations
// ===================================

function initScrollAnimations() {
    const cards = document.querySelectorAll('.post-card');
    
    if ('IntersectionObserver' in window) {
        const cardObserver = new IntersectionObserver((entries) => {
            entries.forEach((entry, index) => {
                if (entry.isIntersecting) {
                    setTimeout(() => {
                        entry.target.style.opacity = '1';
                        entry.target.style.transform = 'translateY(0)';
                    }, index * 100);
                }
            });
        }, {
            threshold: 0.1
        });
        
        cards.forEach(card => {
            card.style.opacity = '0';
            card.style.transform = 'translateY(20px)';
            card.style.transition = 'opacity 0.5s, transform 0.5s';
            cardObserver.observe(card);
        });
    }
}

// ===================================
// Navigation
// ===================================

function initNavigation() {
    // Handle post card clicks with smooth transition
    const postCards = document.querySelectorAll('.post-card');
    
    postCards.forEach(card => {
        card.addEventListener('click', function(e) {
            if (!this.classList.contains('locked')) {
                // Add loading indicator
                this.style.opacity = '0.5';
                this.style.pointerEvents = 'none';
            }
        });
    });
    
    // Smooth scroll to top
    window.scrollToTop = function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    };
}

// ===================================
// Check for Updates
// ===================================

function checkForUpdates() {
    // Check if there are new posts available
    // This can be expanded to fetch from API
    const lastVisit = localStorage.getItem('lastVisit');
    const currentTime = Date.now();
    
    if (!lastVisit) {
        console.log('👋 Welcome to Lokaya gFx Post System!');
    } else {
        const daysSinceVisit = Math.floor((currentTime - lastVisit) / (1000 * 60 * 60 * 24));
        if (daysSinceVisit > 7) {
            console.log('🎉 Welcome back! Check out our latest posts.');
        }
    }
    
    localStorage.setItem('lastVisit', currentTime);
}

// ===================================
// Utility Functions
// ===================================

/**
 * Get post data by ID
 */
function getPostById(postId) {
    return CONFIG.posts.find(post => post.id === postId);
}

/**
 * Navigate to post editor
 */
function navigateToPost(postId) {
    const post = getPostById(postId);
    if (post && post.active) {
        window.location.href = post.path;
    } else {
        alert('This post template is not available yet!');
    }
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => {
            console.log('✅ Copied to clipboard');
        }).catch(err => {
            console.error('❌ Failed to copy:', err);
        });
    } else {
        // Fallback
        const textarea = document.createElement('textarea');
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
    }
}

/**
 * Show notification
 */
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 1.5rem;
        background: ${type === 'error' ? '#ef4444' : '#0084ff'};
        color: white;
        border-radius: 10px;
        font-family: 'Poppins', sans-serif;
        font-size: 0.9rem;
        z-index: 9999;
        animation: slideIn 0.3s ease;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// ===================================
// Analytics (Optional)
// ===================================

/**
 * Track post view
 */
function trackPostView(postId) {
    const views = JSON.parse(localStorage.getItem('postViews') || '{}');
    views[postId] = (views[postId] || 0) + 1;
    localStorage.setItem('postViews', JSON.stringify(views));
    console.log(`📊 Post ${postId} viewed ${views[postId]} times`);
}

/**
 * Get popular posts
 */
function getPopularPosts() {
    const views = JSON.parse(localStorage.getItem('postViews') || '{}');
    return Object.entries(views)
        .sort((a, b) => b[1] - a[1])
        .map(([postId, count]) => ({ postId, count }));
}

// ===================================
// Export for global use
// ===================================

window.PostSystem = {
    config: CONFIG,
    getPostById,
    navigateToPost,
    copyToClipboard,
    showNotification,
    trackPostView,
    getPopularPosts
};

// ===================================
// CSS Animations
// ===================================

const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Post System JS Loaded');
