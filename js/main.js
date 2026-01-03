document.addEventListener('DOMContentLoaded', () => {
    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const categoryNav = document.getElementById('category-nav');
    const profileMenuButton = document.getElementById('profile-menu-button');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (hamburgerMenuButton) {
        hamburgerMenuButton.addEventListener('click', () => {
            categoryNav.classList.toggle('hidden');
        });
    }

    if (profileMenuButton) {
        profileMenuButton.addEventListener('click', () => {
            profileDropdown.classList.toggle('hidden');
        });
    }

    // Close dropdowns if clicking outside of them
    document.addEventListener('click', (event) => {
        if (hamburgerMenuButton && !hamburgerMenuButton.contains(event.target) && categoryNav && !categoryNav.contains(event.target)) {
            categoryNav.classList.add('hidden');
        }
        if (profileMenuButton && !profileMenuButton.contains(event.target) && profileDropdown && !profileDropdown.contains(event.target)) {
            profileDropdown.classList.add('hidden');
        }
    });

    // Check for new registration and show notification
    if (localStorage.getItem('accountJustCreated')) {
        const profileMenuContainer = document.querySelector('.profile-menu-container');
        if (profileMenuContainer) {
            const notificationBubble = document.createElement('div');
            notificationBubble.classList.add('notification-bubble');
            profileMenuContainer.appendChild(notificationBubble);
        }
        localStorage.removeItem('accountJustCreated'); // Clean up the flag
    }

    // Check if user is a developer and show the dashboard link
    if (localStorage.getItem('isDeveloper') === 'true') {
        const developerDashboardLink = document.getElementById('developer-dashboard-link');
        if (developerDashboardLink) {
            developerDashboardLink.classList.remove('hidden');
        }
    }

    // --- Device and Gamepad Detection ---

    function detectDeviceType() {
        const ua = navigator.userAgent;
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            return "Tablet";
        }
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            return "Mobile";
        }
        if (/(nintendo|playstation|xbox|steam)/i.test(ua)) {
            return "Console";
        }
        return "PC";
    }

    function updateDeviceStatus() {
        const deviceStatusElement = document.getElementById('device-status');
        if (deviceStatusElement) {
            deviceStatusElement.textContent = `Device: ${detectDeviceType()}`;
        }
    }

    function updateGamepadStatus(connected = false) {
        const gamepadStatusElement = document.getElementById('gamepad-status');
        if (gamepadStatusElement) {
            const status = connected ? 'Connected' : 'Disconnected';
            gamepadStatusElement.textContent = `Gamepad: ${status}`;
        }
    }

    // Initial check
    updateDeviceStatus();
    // Check if any gamepads are already connected
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isGamepadConnected = Array.from(gamepads).some(g => g);
    updateGamepadStatus(isGamepadConnected);


    window.addEventListener('gamepadconnected', (event) => {
        console.log('Gamepad connected:', event.gamepad);
        updateGamepadStatus(true);
    });

    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad disconnected:', event.gamepad);
        updateGamepadStatus(false);
    });
});
