/**
 * Pizza Royale - Main Application Entry Point
 * Initializes the application and coordinates all modules
 */

import { initializeMenu } from './menu.js';

/**
 * Application startup
 * Called when DOM content is loaded
 */
function initializeApp() {
    console.log('🍕 Pizza Royale initializing...');

    // Initialize menu functionality
    initializeMenu();

    console.log('✅ Pizza Royale ready!');
}

// Start the application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
