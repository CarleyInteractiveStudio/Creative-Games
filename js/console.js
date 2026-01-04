document.addEventListener('DOMContentLoaded', () => {
    const favoriteGames = JSON.parse(localStorage.getItem('favoriteGames')) || [];
    const gameGrid = document.querySelector('.game-grid');

    if (favoriteGames.length === 0) {
        gameGrid.innerHTML = '<p>No favorite games yet. Add some from the main page!</p>';
    } else {
        favoriteGames.forEach(gameId => {
            const gameData = allGames[gameId];
            if (gameData) {
                const gameCard = document.createElement('div');
                gameCard.classList.add('game-card');
                gameCard.dataset.gameId = gameId; // Important for targeting
                gameCard.innerHTML = `
                    <a href="play.html?game=${encodeURIComponent(gameId)}">
                        <img src="${gameData.thumbnail}" alt="${gameId}">
                        <div class="game-card-title">${gameId}</div>
                    </a>
                    <div class="game-card-info">
                        <div class="platform-icons">
                            ${gameData.platforms.map(p => `<img src="images/icons/${p}.svg" alt="${p}">`).join('')}
                        </div>
                        <div class="interaction-buttons">
                            <button class="icon-button favorited"><img src="images/icons/favorite.svg" alt="Favorite"></button>
                        </div>
                    </div>
                `;
                gameGrid.appendChild(gameCard);
            }
        });
    }

    // Now that the cards are loaded, initialize gamepad navigation
    if (typeof initGamepadNavigation === 'function') {
        initGamepadNavigation();
    }
});
