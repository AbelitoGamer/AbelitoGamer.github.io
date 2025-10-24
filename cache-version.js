// Automatic Cache Version Management System
// This file generates a timestamp-based cache version that is automatically included
// in all HTML files to prevent caching issues on GitHub Pages

(function() {
    'use strict';
    
    // Generate cache version based on build time
    // This will be replaced during build/deployment
    window.CACHE_VERSION = '{{CACHE_VERSION}}';
    
    // If not replaced (dev mode), use timestamp
    if (window.CACHE_VERSION === '{{CACHE_VERSION}}') {
        window.CACHE_VERSION = Date.now().toString();
    }
    
    console.log('Cache version:', window.CACHE_VERSION);
    
    // Helper function to add cache version to URLs
    window.addCacheVersion = function(url) {
        if (!url) return url;
        
        // Don't add version to external URLs
        if (url.startsWith('http://') || url.startsWith('https://')) {
            // Unless it's our own domain
            if (!url.includes(window.location.hostname)) {
                return url;
            }
        }
        
        // Check if URL already has query parameters
        const separator = url.includes('?') ? '&' : '?';
        
        // Remove existing v= parameter if present
        url = url.replace(/[?&]v=[^&]*/g, '');
        
        // Add new version parameter
        return url + separator + 'v=' + window.CACHE_VERSION;
    };
    
})();
