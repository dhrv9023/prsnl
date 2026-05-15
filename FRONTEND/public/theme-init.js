// Runs before React loads to prevent flash of wrong theme.
// Keep this file tiny — it must be synchronous and blocking.
(function () {
    var saved = localStorage.getItem('theme');
    if (saved !== 'light') {
        document.documentElement.classList.add('dark');
    }

    // ✅ SECURITY: Clean OAuth code from URL immediately (before React renders)
    // This prevents the authorization code from being visible in the address bar
    if (window.location.pathname === '/auth/callback') {
        var params = new URLSearchParams(window.location.search);
        if (params.has('code') || params.has('error') || params.has('error_description')) {
            window.history.replaceState({}, '', window.location.pathname);
        }
    }
})();
