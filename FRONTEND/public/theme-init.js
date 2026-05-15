// Runs before React loads to prevent flash of wrong theme.
// Keep this file tiny — it must be synchronous and blocking.
(function () {
    var saved = localStorage.getItem('theme');
    if (saved !== 'light') {
        document.documentElement.classList.add('dark');
    }

    // ✅ SECURITY: Clean OAuth code from URL immediately (before React renders)
    // BUT ONLY after a small delay to let React read it first
    if (window.location.pathname === '/auth/callback') {
        var params = new URLSearchParams(window.location.search);
        if (params.has('code') || params.has('error') || params.has('error_description')) {
            // Delay cleanup by 100ms to let React's useEffect run first
            setTimeout(function() {
                window.history.replaceState({}, '', window.location.pathname);
            }, 100);
        }
    }
})();
