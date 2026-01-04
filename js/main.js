document.addEventListener('DOMContentLoaded', () => {
    const profileMenuButton = document.getElementById('profile-menu-button');
    const profileDropdown = document.getElementById('profile-dropdown');

    if (profileMenuButton) {
        profileMenuButton.addEventListener('click', () => {
            profileDropdown.classList.toggle('hidden');
        });
    }

    // Close dropdowns if clicking outside of them
    document.addEventListener('click', (event) => {
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
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) { return "Tablet"; }
        if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) { return "Mobile"; }
        if (/(nintendo|playstation|xbox|steam)/i.test(ua)) { return "Console"; }
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

    updateDeviceStatus();
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    const isGamepadConnected = Array.from(gamepads).some(g => g);
    updateGamepadStatus(isGamepadConnected);

    function showConsoleModePrompt() {
        if (document.getElementById('console-mode-prompt')) return; // Prevent multiple prompts
        const prompt = document.createElement('div');
        prompt.id = 'console-mode-prompt';
        prompt.className = 'console-prompt';
        prompt.innerHTML = 'Gamepad connected. Press <b>Start</b> to enter Console Mode.';
        document.body.appendChild(prompt);

        const interval = setInterval(() => {
            const gps = navigator.getGamepads();
            if (gps[0] && gps[0].buttons[9].pressed) {
                clearInterval(interval);
                window.location.href = 'console.html';
            }
        }, 100);

        setTimeout(() => {
            clearInterval(interval);
            if (prompt) prompt.remove();
        }, 10000);
    }

    window.addEventListener('gamepadconnected', (e) => {
        updateGamepadStatus(true);
        showConsoleModePrompt();
    });

    window.addEventListener('gamepaddisconnected', (e) => {
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
        const button = document.querySelector(`.game-card[data-game-id="${gameId}"] .icon-button`);
        if (favorites.includes(gameId)) {
            favorites = favorites.filter(id => id !== gameId);
            if (button) button.classList.remove('favorited');
        } else {
            favorites.push(gameId);
            if (button) button.classList.add('favorited');
        }
        saveFavorites(favorites);
    }

    function setupFavoriteButtonListeners() {
        document.querySelectorAll('.interaction-buttons .icon-button').forEach(button => {
            button.addEventListener('click', (event) => {
                event.preventDefault(); // Prevent navigation when clicking the button
                const gameCard = button.closest('.game-card');
                const gameId = gameCard.dataset.gameId;
                if (gameId) {
                    toggleFavorite(gameId);
                }
            });
        });
    }

    // --- Dynamic Game Catalog Population ---
    function populateGameCatalogs() {
        const favorites = getFavorites();
        const allGamesGrid = document.querySelector('#all-games-catalog .game-grid');
        const catalogs = {
            'Racing': document.querySelector('#racing-catalog .game-grid'),
            'Shooter': document.querySelector('#shooter-catalog .game-grid'),
            'Adventure': document.querySelector('#adventure-catalog .game-grid'),
            'Puzzle': document.querySelector('#puzzle-catalog .game-grid'),
            'Sports': document.querySelector('#sports-catalog .game-grid'),
        };

        if (!allGamesGrid) return; // Exit if we are not on the main page

        for (const gameId in allGames) {
            const gameData = allGames[gameId];
            const isFavorited = favorites.includes(gameId);

            const gameCardHTML = `
                <div class="game-card" data-game-id="${gameId}">
                    <a href="play.html?game=${encodeURIComponent(gameId)}" class="game-card-link">
                        <img src="${gameData.thumbnail}" alt="${gameId}" class="game-card-image">
                        <div class="game-card-overlay">
                            <div class="game-card-title">${gameId}</div>
                            <div class="game-card-details">
                                <div class="platform-icons">
                                    ${gameData.platforms.map(p => `<img src="images/icons/${p}.svg" alt="${p}">`).join('')}
                                </div>
                                <div class="interaction-buttons">
                                    <button class="icon-button ${isFavorited ? 'favorited' : ''}" aria-label="Favorite">
                                        <img src="images/icons/favorite.svg" alt="Favorite">
                                    </button>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            `;

            // Add to "All Games" catalog
            allGamesGrid.innerHTML += gameCardHTML;

            // Add to specific category catalog
            if (gameData.category && catalogs[gameData.category]) {
                catalogs[gameData.category].innerHTML += gameCardHTML;
            }
        }

        // After populating, set up the event listeners
        setupFavoriteButtonListeners();

        // NOW initialize gamepad navigation
        if (typeof initGamepadNavigation === 'function') {
            initGamepadNavigation();
        }
    }

    // Initial population of game catalogs
    populateGameCatalogs();
});
