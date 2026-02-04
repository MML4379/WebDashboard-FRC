import { router, navigateTo } from './router/router.js';

document.addEventListener("DOMContentLoaded", () => {
    // Handle link clicks
    document.body.addEventListener("click", e => {
        if (e.target.closest("[data-link]")) {
            e.preventDefault();
            navigateTo(e.target.href);
        }
    });

    // Initialize router
    router();
});

// Handle forward/back buttons
window.addEventListener('popstate', router);