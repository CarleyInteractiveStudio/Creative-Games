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


    function showConsoleModePrompt() {
        const prompt = document.createElement('div');
        prompt.id = 'console-mode-prompt';
        prompt.style.position = 'fixed';
        prompt.style.bottom = '20px';
        prompt.style.left = '50%';
        prompt.style.transform = 'translateX(-50%)';
        prompt.style.backgroundColor = 'rgba(0,0,0,0.8)';
        prompt.style.color = 'white';
        prompt.style.padding = '15px 30px';
        prompt.style.borderRadius = '10px';
        prompt.style.zIndex = '1001';
        prompt.innerHTML = 'Gamepad connected. Press <b>Start</b> to enter Console Mode.';
        document.body.appendChild(prompt);

        // Listen for the "Start" button (button 9) to be pressed
        const interval = setInterval(() => {
            const gamepads = navigator.getGamepads();
            if (gamepads[0] && gamepads[0].buttons[9].pressed) {
                clearInterval(interval);
                window.location.href = 'console.html';
            }
        }, 100);

        // Remove the prompt after a while if not used
        setTimeout(() => {
            clearInterval(interval);
            if (document.getElementById('console-mode-prompt')) {
                prompt.remove();
            }
        }, 10000);
    }

    window.addEventListener('gamepadconnected', (event) => {
        console.log('Gamepad connected:', event.gamepad);
        updateGamepadStatus(true);
        showConsoleModePrompt();
    });

    window.addEventListener('gamepaddisconnected', (event) => {
        console.log('Gamepad disconnected:', event.gamepad);
        updateGamepadStatus(false);
    });

    // --- Favorite Games Logic ---
    function getFavorites() {
        return JSON.parse(localStorage.getItem('favoriteGames')) || [];
    }

    function saveFavorites(favorites) {
        localStorage.setItem('favoriteGames', JSON.stringify(favorites));
    }

    function toggleFavorite(gameId) {
        let favorites = getFavorites();
        if (favorites.includes(gameId)) {
            favorites = favorites.filter(id => id !== gameId);
        } else {
            favorites.push(gameId);
        }
        saveFavorites(favorites);
    }

    // Add event listeners to favorite buttons
    document.querySelectorAll('.interaction-buttons .icon-button').forEach(button => {
        button.addEventListener('click', () => {
            const gameCard = button.closest('.game-card');
            const gameId = gameCard.dataset.gameId;
            if (gameId) {
                toggleFavorite(gameId);
                button.classList.toggle('favorited');
            }
        });
    });
});
