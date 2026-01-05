document.addEventListener('DOMContentLoaded', () => {
    const profileMenuButton = document.getElementById('profile-menu-button');
    const profileDropdown = document.getElementById('profile-dropdown');

    // Function to update the profile menu based on login status
    function updateProfileMenu() {
        if (!profileDropdown) return;

        // Use 'isDeveloper' as a proxy for being logged in
        const isLoggedIn = localStorage.getItem('isDeveloper') === 'true';

        if (isLoggedIn) {
            profileDropdown.innerHTML = `
                <a href="configuracion.html" class="dropdown-item">
                    <img src="images/icons/user.svg" alt="Profile Icon"> Mi Perfil
                </a>
                <a href="configuracion.html" class="dropdown-item">
                    <img src="images/icons/settings.svg" alt="Settings Icon"> Configuración
                </a>
                <a href="#" id="logout-button" class="dropdown-item">
                    <img src="images/icons/logout.svg" alt="Logout Icon"> Cerrar Sesión
                </a>
            `;

            const logoutButton = document.getElementById('logout-button');
            if (logoutButton) {
                logoutButton.addEventListener('click', (event) => {
                    event.preventDefault();
                    // Clear user-related data from localStorage
                    localStorage.removeItem('isDeveloper');
                    // Add any other keys you use for session management
                    // For example: localStorage.removeItem('authToken');
                    window.location.reload(); // Reload the page to reflect the change
                });
            }
        } else {
            profileDropdown.innerHTML = `
                <a href="login.html">Iniciar Sesión</a>
            `;
        }
    }

    if (profileMenuButton) {
        profileMenuButton.addEventListener('click', () => {
            profileDropdown.classList.toggle('hidden');
        });
    }

    // Initial call to set the menu correctly on page load
    updateProfileMenu();

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

    updateDeviceStatus();

    const gamepadNotification = document.getElementById('gamepad-notification');
    let gamepadPollInterval;
    let buttonPressState = false; // To prevent multiple triggers

    function pollForModeButton() {
        const configStr = localStorage.getItem('gamepadConfig');
        if (!configStr) { // Stop if config is removed
            if (gamepadPollInterval) {
                cancelAnimationFrame(gamepadPollInterval);
                gamepadPollInterval = null;
            }
            return;
        };

        const config = JSON.parse(configStr);
        const modeButtonIndex = config.buttons?.mode;

        if (typeof modeButtonIndex === 'undefined') return;

        const gamepads = navigator.getGamepads();
        if (gamepads && gamepads[0]) {
            const gp = gamepads[0];
            if (gp.buttons[modeButtonIndex] && gp.buttons[modeButtonIndex].pressed) {
                if (!buttonPressState) {
                    buttonPressState = true;
                    window.location.href = 'console.html';
                    // Stop polling immediately after navigation
                    if (gamepadPollInterval) {
                        cancelAnimationFrame(gamepadPollInterval);
                        gamepadPollInterval = null;
                    }
                }
            } else {
                buttonPressState = false;
            }
        }

        // Continue polling if we are still here
        if (gamepadPollInterval) {
             gamepadPollInterval = requestAnimationFrame(pollForModeButton);
        }
    }

    window.addEventListener('gamepadconnected', (e) => {
        // Only show notification and start polling if a config exists
        if (localStorage.getItem('gamepadConfig')) {
            if (gamepadNotification) {
                gamepadNotification.classList.add('visible');
            }
            // Start polling if not already doing so
            if (!gamepadPollInterval) {
                gamepadPollInterval = requestAnimationFrame(pollForModeButton);
            }
        }
    });

    window.addEventListener('gamepaddisconnected', (e) => {
        if (gamepadNotification) {
            gamepadNotification.classList.remove('visible');
        }
        // Always stop polling on disconnect
        if (gamepadPollInterval) {
            cancelAnimationFrame(gamepadPollInterval);
            gamepadPollInterval = null;
        }
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
