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

    // --- Gamepad Activation Bubble Logic ---
    const activationBubble = document.getElementById('gamepad-activation-bubble');
    let activationCheckInterval;

    window.addEventListener('gamepadConfigured', () => {
        // First, update the generic status footer
        updateGamepadStatus(true);

        // Then, show the activation prompt
        if (activationBubble) {
            activationBubble.classList.remove('hidden');
        }

        // Stop any previous interval if a new controller is configured
        if (activationCheckInterval) clearInterval(activationCheckInterval);

        // Start checking for the activation button press
        activationCheckInterval = setInterval(() => {
            const gamepad = navigator.getGamepads().find(g => g);
            const config = window.getCurrentGamepadConfig();

            // The START button is typically index 9, which we use as a default.
            const startButtonIndex = config ? config.START : 9;

            if (gamepad && gamepad.buttons[startButtonIndex] && gamepad.buttons[startButtonIndex].pressed) {
                if (activationBubble) {
                    activationBubble.classList.add('hidden');
                }
                // Dispatch event to enable full navigation
                window.dispatchEvent(new CustomEvent('gamepadNavigationActivated', { detail: { gamepad } }));
                clearInterval(activationCheckInterval);
            }
        }, 100); // Check every 100ms
    });

    window.addEventListener('gamepadconnected', (e) => {
        // This listener now ONLY updates the status, the config script handles the rest.
        updateGamepadStatus(true);
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

        // --- Prioritized Game Recommendations ---
        // Get the current controller profile ('xbox', 'playstation', etc.)
        const controllerProfile = typeof window.getCurrentGamepadProfile === 'function' ? window.getCurrentGamepadProfile() : null;
        let sortedGameIds = Object.keys(allGames);

        if (controllerProfile) {
            // This is a simple sorting algorithm. A real-world implementation might be more complex.
            // It prioritizes games that are exclusive to the detected platform.
            sortedGameIds.sort((a, b) => {
                const gameA = allGames[a];
                const gameB = allGames[b];
                const platformA = gameA.platforms.includes(controllerProfile);
                const platformB = gameB.platforms.includes(controllerProfile);

                if (platformA && !platformB) return -1; // A comes first
                if (!platformA && platformB) return 1;  // B comes first
                return 0; // Keep original order
            });
        }
        // --- End of Recommendations ---

        const catalogs = {
            'Racing': document.querySelector('#racing-catalog .game-grid'),
            'Shooter': document.querySelector('#shooter-catalog .game-grid'),
            'Adventure': document.querySelector('#adventure-catalog .game-grid'),
            'Puzzle': document.querySelector('#puzzle-catalog .game-grid'),
            'Sports': document.querySelector('#sports-catalog .game-grid'),
        };

        if (!allGamesGrid) return; // Exit if we are not on the main page

        // Use the new sorted list of game IDs to populate the catalogs
        for (const gameId of sortedGameIds) {
            const gameData = allGames[gameId];
            const isFavorited = favorites.includes(gameId);

            const gameCardHTML = `
                <div class="game-card" data-game-id="${gameId}">
                    <a href="play.html?game=${encodeURIComponent(gameId)}">
                        <img src="${gameData.thumbnail}" alt="${gameId}">
                        <div class="game-card-title">${gameId}</div>
                    </a>
                    <div class="game-card-info">
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

    // --- Search Functionality ---
    const searchInput = document.querySelector('.search-bar input');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            document.querySelectorAll('.game-card').forEach(card => {
                const title = card.querySelector('.game-card-title').textContent.toLowerCase();
                if (title.includes(searchTerm)) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    }
});
