// Runs before React loads to prevent flash of wrong theme.
// Keep this file tiny — it must be synchronous and blocking.
(function () {
    var saved = localStorage.getItem('theme');
    // Default to dark mode unless user explicitly chose light
    if (saved === 'light') {
        document.documentElement.classList.remove('dark');
    } else {
        document.documentElement.classList.add('dark');
    }
})();
