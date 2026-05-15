// Runs before React loads to prevent flash of wrong theme.
// Keep this file tiny — it must be synchronous and blocking.
(function () {
    var saved = localStorage.getItem('theme');
    if (saved !== 'light') {
        document.documentElement.classList.add('dark');
    }
})();
