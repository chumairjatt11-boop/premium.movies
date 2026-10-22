document.addEventListener('DOMContentLoaded', () => {
    const sidebarContainer = document.getElementById('dynamic-sidebar');
    const openSidebarBtn = document.getElementById('open-sidebar-btn');
    const closeSidebarBtn = document.getElementById('close-sidebar-btn');
    const searchInput = document.querySelector('.topnav input[type="text"]');

    if (sidebarContainer && openSidebarBtn) {
        const setSidebarOpen = isOpen => {
            sidebarContainer.classList.toggle('active', isOpen);
            sidebarContainer.inert = !isOpen;
            openSidebarBtn.setAttribute('aria-expanded', String(isOpen));
        };

        openSidebarBtn.addEventListener('click', () => {
            setSidebarOpen(!sidebarContainer.classList.contains('active'));
        });
        closeSidebarBtn?.addEventListener('click', () => setSidebarOpen(false));
        sidebarContainer.querySelectorAll('.sidebar-link').forEach(link => {
            link.addEventListener('click', () => setSidebarOpen(false));
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') setSidebarOpen(false);
        });
    }

    if (searchInput) {
        const movieRows = document.querySelectorAll('.movie-row-item');
        searchInput.addEventListener('input', event => {
            const searchText = event.target.value.toLowerCase().trim();

            movieRows.forEach(row => {
                const titleText = row.querySelector('.movie-title-text').innerText.toLowerCase();
                const badgeText = row.querySelector('.badge-tag').innerText.toLowerCase();
                row.style.display = titleText.includes(searchText) || badgeText.includes(searchText)
                    ? 'flex'
                    : 'none';
            });
        });
    }
});
