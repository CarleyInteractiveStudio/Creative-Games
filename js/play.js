document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DEL DOM ---
    const gameTitleEl = document.getElementById('game-title');
    const gameDescriptionEl = document.getElementById('game-description');
    const gamePlayAreaEl = document.getElementById('game-play-area');
    const gameActionsBarEl = document.getElementById('game-actions-bar');
    const socialLinksEl = document.getElementById('social-links');
    const similarGamesCatalogEl = document.getElementById('similar-games-catalog');
    const modalEl = document.getElementById('details-modal');
    const closeModalButtonEl = document.getElementById('close-modal-button');

    // --- OBTENER PARÁMETROS DE LA URL ---
    function getQueryParam(param) {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get(param);
    }

    const currentGameId = getQueryParam('game');
    const gameData = allGames[currentGameId];

    // --- FUNCIÓN PRINCIPAL DE CARGA ---
    function loadGame() {
        if (gameData) {
            // Cargar contenido principal
            gameTitleEl.textContent = currentGameId;
            gameDescriptionEl.textContent = gameData.description || 'No description available.';

            // Mostrar imagen de portada y botón de "Jugar"
            gamePlayAreaEl.innerHTML = `
                <div class="game-thumbnail-container">
                    <img src="${gameData.thumbnail}" alt="${currentGameId} Thumbnail" class="game-thumbnail">
                    <button id="play-button">Jugar</button>
                </div>
            `;

            // Renderizar componentes dinámicos
            renderActionButtons();
            renderSocialLinks();
            loadSimilarGames(gameData.category, currentGameId);
            populateDetails();
            setupEventListeners();

        } else {
            // Manejar juego no encontrado
            gameTitleEl.textContent = 'Game Not Found';
            gameDescriptionEl.textContent = 'This game could not be found. Please check the URL or go back to the homepage.';
            document.getElementById('similar-games-column').style.display = 'none';
        }
    }

    // --- RENDERIZADO DE COMPONENTES ---
    function renderActionButtons() {
        const buttons = [
            { id: 'favorite', label: 'Favorite', icon: 'favorite.svg' },
            { id: 'like', label: 'Like', icon: 'like.svg' },
            { id: 'dislike', label: 'Dislike', icon: 'dislike.svg' },
            { id: 'share', label: 'Share', icon: 'share.svg' },
            { id: 'fullscreen', label: 'Fullscreen', icon: 'fullscreen.svg' },
            { id: 'controls', label: 'Controls & Info', icon: 'mando.svg' }
        ];

        let buttonsHTML = '';
        buttons.forEach(button => {
            const iconHTML = `<img src="images/icons/${button.icon}" alt="${button.label}">`;
            buttonsHTML += `<button id="${button.id}-button" class="icon-button" aria-label="${button.label}">${iconHTML}</button>`;
        });
        gameActionsBarEl.innerHTML = buttonsHTML;
    }

    function renderSocialLinks() {
        if (!gameData.social) {
            socialLinksEl.style.display = 'none';
            return;
        }

        const socialPlatforms = [
            { key: 'website', icon: 'website.svg', label: 'Website' },
            { key: 'whatsapp', icon: 'whatsapp.svg', label: 'WhatsApp' },
            { key: 'facebook', icon: 'facebook.svg', label: 'Facebook' },
            { key: 'tiktok', icon: 'tiktok.svg', label: 'TikTok' },
            { key: 'discord', icon: 'discord.svg', label: 'Discord' }
        ];

        let linksHTML = '';
        socialPlatforms.forEach(platform => {
            if (gameData.social[platform.key]) {
                linksHTML += `
                    <a href="${gameData.social[platform.key]}" target="_blank" class="social-button icon-button" aria-label="${platform.label}">
                        <img src="images/icons/${platform.icon}" alt="${platform.label}">
                    </a>`;
            }
        });
        socialLinksEl.innerHTML = linksHTML;
    }

    function loadSimilarGames(category, currentGameId) {
        const similarGames = Object.keys(allGames)
            .filter(id => allGames[id].category === category && id !== currentGameId)
            .slice(0, 8);

        if (similarGames.length === 0) {
            document.getElementById('similar-games-column').style.display = 'none';
            return;
        }

        let catalogHTML = '';
        similarGames.forEach(gameId => {
            const game = allGames[gameId];
            catalogHTML += `
                <div class="game-card" data-game-id="${gameId}">
                    <a href="play.html?game=${encodeURIComponent(gameId)}" class="game-card-link">
                        <img src="${game.thumbnail}" alt="${gameId}" class="game-card-image">
                        <div class="game-card-overlay">
                            <h3 class="game-card-title">${gameId}</h3>
                        </div>
                    </a>
                </div>`;
        });
        similarGamesCatalogEl.innerHTML = catalogHTML;
    }

    function populateDetails() {
        const detailsBubble = document.getElementById('details-bubble');
        const hasDetails = gameData.developer || gameData.engine || gameData.rating || gameData.releaseDate || gameData.lastUpdate;

        if (hasDetails) {
            detailsBubble.style.display = 'block';
            document.getElementById('bubble-developer').textContent = gameData.developer || 'N/A';
            document.getElementById('bubble-engine').textContent = gameData.engine || 'N/A';
            document.getElementById('bubble-rating').textContent = gameData.rating || 'N/A';
            document.getElementById('bubble-release-date').textContent = gameData.releaseDate || 'N/A';
            document.getElementById('bubble-last-update').textContent = gameData.lastUpdate || 'N/A';
        } else {
            detailsBubble.style.display = 'none';
        }

        document.getElementById('modal-controls').textContent = gameData.controls || 'No controls information available.';
    }

    // --- MANEJO DE EVENTOS ---
    function setupEventListeners() {
        // Listener para el botón "Jugar"
        document.getElementById('play-button')?.addEventListener('click', () => {
            gamePlayAreaEl.innerHTML = `<iframe src="games/${encodeURIComponent(currentGameId)}/index.html" frameborder="0"></iframe>`;
        });

        // Listeners para botones de acción
        document.getElementById('fullscreen-button')?.addEventListener('click', () => {
             const iframe = gamePlayAreaEl.querySelector('iframe');
            if (iframe && iframe.requestFullscreen) {
                iframe.requestFullscreen();
            }
        });

        document.getElementById('share-button')?.addEventListener('click', () => {
            if (navigator.share) {
                navigator.share({ title: currentGameId, text: `Check out ${currentGameId}!`, url: window.location.href });
            } else {
                navigator.clipboard.writeText(window.location.href).then(() => alert('Link copied to clipboard!'));
            }
        });

        // Listeners para el modal
        document.getElementById('controls-button')?.addEventListener('click', () => {
            modalEl.classList.remove('modal-hidden');
        });

        closeModalButtonEl.addEventListener('click', () => {
            modalEl.classList.add('modal-hidden');
        });

        modalEl.addEventListener('click', (event) => {
            if (event.target === modalEl) {
                modalEl.classList.add('modal-hidden');
            }
        });
    }

    // --- INICIALIZACIÓN ---
    loadGame();
});
