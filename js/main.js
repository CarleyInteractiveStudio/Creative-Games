document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const categoryNav = document.getElementById('category-nav');
    const profileMenuButton = document.getElementById('profile-menu-button');
    const profileDropdown = document.getElementById('profile-dropdown');

    hamburgerMenuButton.addEventListener('click', () => {
        categoryNav.classList.toggle('hidden');
    });

    profileMenuButton.addEventListener('click', () => {
        profileDropdown.classList.toggle('hidden');
    });

    // Close dropdowns if clicking outside of them
    document.addEventListener('click', (event) => {
        if (!hamburgerMenuButton.contains(event.target) && !categoryNav.contains(event.target)) {
            categoryNav.classList.add('hidden');
        }
        if (!profileMenuButton.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.add('hidden');
        }
    });
});
