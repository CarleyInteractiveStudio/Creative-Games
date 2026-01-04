document.addEventListener('DOMContentLoaded', () => {
    // Function to get query parameters from URL
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    // Function to load game details
    function loadGameDetails() {
        const gameId = getQueryParam('game');
        const gameData = allGames[gameId];

        if (gameData) {
            // Update the UI with the game data
            document.getElementById('game-title').textContent = gameId;
            document.getElementById('game-description').textContent = gameData.description;
            document.getElementById('game-controls').textContent = gameData.controls;

            // TODO: Load the actual game embed code or placeholder
            const gamePlayArea = document.querySelector('.game-play-area .game-placeholder');
            if (gamePlayArea) {
                gamePlayArea.innerHTML = `<p>Now Playing: ${gameId}</p>`; // Placeholder
            }

            // Load related games
            loadRelatedGames(gameData.category, gameId);
        } else {
            // Handle case where game is not found
            document.getElementById('game-title').textContent = 'Game not found';
            document.getElementById('game-description').textContent = 'This game could not be found. Please check the URL or go back to the homepage.';
        }
    }

    // --- Button Functionality ---
    function setupActionButtons() {
        const fullscreenButton = document.getElementById('fullscreen-button');
        const shareButton = document.getElementById('share-button');
        const controlsButton = document.getElementById('controls-button');
        const gamePlayArea = document.querySelector('.game-play-area');
        const controlsElement = document.getElementById('controls-section');

        if (fullscreenButton && gamePlayArea) {
            fullscreenButton.addEventListener('click', () => {
                if (gamePlayArea.requestFullscreen) {
                    gamePlayArea.requestFullscreen();
                }
            });
        }

        if (shareButton) {
            shareButton.addEventListener('click', () => {
                if (navigator.share) {
                    navigator.share({
                        title: document.getElementById('game-title').textContent,
                        text: 'Check out this game!',
                        url: window.location.href
                    }).catch(console.error);
                } else {
                    // Fallback for browsers that don't support navigator.share
                    navigator.clipboard.writeText(window.location.href).then(() => {
                        alert('Link copied to clipboard!');
                    });
                }
            });
        }

        if (controlsButton && controlsElement) {
             // Initially hide controls
            controlsElement.style.display = 'none';
            controlsButton.addEventListener('click', () => {
                const isHidden = controlsElement.style.display === 'none';
                controlsElement.style.display = isHidden ? 'block' : 'none';
            });
        }
    }

    // --- Related Games ---
    function loadRelatedGames(category, currentGameId) {
        const relatedGamesGrid = document.getElementById('related-games-grid');
        if (!relatedGamesGrid) return;

        const relatedGames = Object.keys(allGames)
            .filter(id => allGames[id].category === category && id !== currentGameId)
            .slice(0, 4); // Get up to 4 related games

        relatedGamesGrid.innerHTML = ''; // Clear existing content

        if (relatedGames.length === 0) {
            // Optional: show a message if no other games are in the same category
            const parentSection = relatedGamesGrid.closest('.game-catalog');
            if(parentSection) parentSection.style.display = 'none';
            return;
        }

        relatedGames.forEach(gameId => {
            const gameData = allGames[gameId];
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
                            </div>
                        </div>
                    </a>
                </div>
            `;
            relatedGamesGrid.innerHTML += gameCardHTML;
        });
    }

    // Initial load
    loadGameDetails();
    setupActionButtons();
});
