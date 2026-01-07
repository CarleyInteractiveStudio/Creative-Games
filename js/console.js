document.addEventListener('DOMContentLoaded', () => {
    const consoleContainer = document.getElementById('console-container');
    const detailsBubble = document.getElementById('game-details-bubble');
    const bubbleImage = detailsBubble.querySelector('.bubble-image img');
    const bubbleTitle = document.getElementById('bubble-title');
    const bubbleDescription = document.getElementById('bubble-description');
    const bubbleMeta = document.getElementById('bubble-meta');

    let carousels = [];
    let activeCarouselIndex = 0;

    function getConsoleGames() {
        return Object.keys(allGames).filter(gameId =>
            allGames[gameId].platforms && allGames[gameId].platforms.includes('console')
        ).reduce((acc, gameId) => {
            acc[gameId] = allGames[gameId];
            return acc;
        }, {});
    }

    function getFavoriteConsoleGames(consoleGames) {
        const favoriteGameIds = JSON.parse(localStorage.getItem('favoriteGames')) || [];
        return favoriteGameIds.filter(gameId => consoleGames[gameId]);
    }

    function getGamesByCategory(consoleGames) {
        return Object.keys(consoleGames).reduce((acc, gameId) => {
            const game = consoleGames[gameId];
            const category = game.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(gameId);
            return acc;
        }, {});
    }

    function createCarousel(title, gameIds) {
        if (!gameIds || gameIds.length === 0) return;

        const section = document.createElement('section');
        section.className = 'carousel-section';

        const h2 = document.createElement('h2');
        h2.textContent = title;
        section.appendChild(h2);

        const carouselDiv = document.createElement('div');
        carouselDiv.className = 'game-carousel';

        gameIds.forEach(gameId => {
            const gameData = allGames[gameId];
            if (gameData) {
                const card = document.createElement('div');
                card.className = 'carousel-item';
                card.style.backgroundImage = `url('${gameData.thumbnail}')`;
                card.dataset.gameId = gameId;
                // Add an accessible label
                card.setAttribute('role', 'button');
                card.setAttribute('aria-label', gameId);
                carouselDiv.appendChild(card);
            }
        });

        section.appendChild(carouselDiv);
        consoleContainer.appendChild(section);

        carousels.push({
            element: carouselDiv,
            games: gameIds,
            selectedIndex: 0,
            cards: Array.from(carouselDiv.children)
        });
    }

    function updateCarouselView(carouselIndex, immediate = false) {
        const carousel = carousels[carouselIndex];
        if (!carousel) return;

        const { cards, selectedIndex } = carousel;

        cards.forEach((card, index) => {
            card.classList.remove('selected', 'prev', 'next', 'far-prev', 'far-next');
            const diff = index - selectedIndex;

            if (diff === 0) card.classList.add('selected');
            else if (diff === 1) card.classList.add('next');
            else if (diff === -1) card.classList.add('prev');
            else if (diff === 2) card.classList.add('far-next');
            else if (diff === -2) card.classList.add('far-prev');
        });

        const selectedGame = carousel.games[selectedIndex];
        if (selectedGame) {
            updateDetailsBubble(selectedGame);
        }
    }

    function updateDetailsBubble(gameId) {
        const gameData = allGames[gameId];
        if (!gameData) return;

        bubbleImage.src = gameData.thumbnail;
        bubbleTitle.textContent = gameId;
        bubbleDescription.textContent = gameData.description || 'No description available.';
        bubbleMeta.innerHTML = `
            <span><strong>Developer:</strong> ${gameData.developer || 'N/A'}</span>
            <span><strong>Release:</strong> ${gameData.releaseDate || 'N/A'}</span>
        `;
        detailsBubble.classList.remove('hidden');
    }

    function handleKeyDown(e) {
        if (carousels.length === 0) return;

        const activeCarousel = carousels[activeCarouselIndex];
        let selectedIndex = activeCarousel.selectedIndex;

        switch (e.key) {
            case 'ArrowRight':
                if (selectedIndex < activeCarousel.games.length - 1) {
                    activeCarousel.selectedIndex++;
                    updateCarouselView(activeCarouselIndex);
                }
                break;
            case 'ArrowLeft':
                if (selectedIndex > 0) {
                    activeCarousel.selectedIndex--;
                    updateCarouselView(activeCarouselIndex);
                }
                break;
            case 'ArrowDown':
                if (activeCarouselIndex < carousels.length - 1) {
                    activeCarouselIndex++;
                    carousels[activeCarouselIndex].element.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    updateCarouselView(activeCarouselIndex);
                }
                break;
            case 'ArrowUp':
                if (activeCarouselIndex > 0) {
                    activeCarouselIndex--;
                    carousels[activeCarouselIndex].element.parentElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    updateCarouselView(activeCarouselIndex);
                }
                break;
            case 'Enter':
                const gameId = activeCarousel.games[selectedIndex];
                window.location.href = `play.html?game=${encodeURIComponent(gameId)}`;
                break;
        }
    }

    function init() {
        const consoleGames = getConsoleGames();
        const favoriteConsoleGames = getFavoriteConsoleGames(consoleGames);
        const categorizedGames = getGamesByCategory(consoleGames);

        createCarousel('All Console Games', Object.keys(consoleGames));
        createCarousel('Favorite Games', favoriteConsoleGames);

        Object.keys(categorizedGames).sort().forEach(category => {
            createCarousel(category, categorizedGames[category]);
        });

        if (carousels.length > 0) {
            carousels.forEach((_, index) => updateCarouselView(index, true));
            document.addEventListener('keydown', handleKeyDown);
        } else {
            consoleContainer.innerHTML = '<p style="text-align: center; font-size: 1.2rem;">No console-compatible games found.</p>';
            detailsBubble.classList.add('hidden');
        }
    }

    init();
});
