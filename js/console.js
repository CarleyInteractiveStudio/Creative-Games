document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let allConsoleGames = [];
    let filteredConsoleGames = [];
    let currentGameIndex = 0;
    let currentCategory = 'Todo';
    let gamepadConnected = false;
    let buttonPressStates = {};

    // --- DOM ELEMENTS ---
    const categoryFiltersContainer = document.getElementById('category-filters');
    const gameCarousel = document.getElementById('game-carousel');
    const detailsBubble = document.getElementById('game-details-bubble');
    const descriptionContainer = document.getElementById('details-description');
    const shortDescriptionContainer = document.getElementById('details-short-description');
    const controlsContainer = document.getElementById('details-controls');
    const detailsTitle = document.getElementById('details-title');
    const detailsToggleButton = document.getElementById('details-toggle-btn');

    // --- INITIALIZATION ---
    function init() {
        allConsoleGames = Object.entries(allGames)
            .filter(([id, game]) => game.platforms.includes('console'))
            .map(([id, game]) => ({ ...game, id }));

        populateCategoryFilters();
        applyCategoryFilter();
        setupEventListeners();
        setupGamepadListeners();
    }

    // --- DATA FILTERING & RENDERING ---
    function populateCategoryFilters() {
        const categories = ['Todo', 'Favoritos', ...new Set(allConsoleGames.map(game => game.category).filter(Boolean))];
        categoryFiltersContainer.innerHTML = categories.map(cat => `<button class="category-filter ${cat === currentCategory ? 'active' : ''}" data-category="${cat}">${cat}</button>`).join('');
    }

    function applyCategoryFilter() {
        const favoriteGames = JSON.parse(localStorage.getItem('favoriteGames')) || [];

        if (currentCategory === 'Todo') {
            filteredConsoleGames = [...allConsoleGames];
        } else if (currentCategory === 'Favoritos') {
            filteredConsoleGames = allConsoleGames.filter(game => favoriteGames.includes(game.id));
        } else {
            filteredConsoleGames = allConsoleGames.filter(game => game.category === currentCategory);
        }

        currentGameIndex = 0;
        renderCarousel();
        updateDetails(filteredConsoleGames[currentGameIndex]);

        // Update active class on buttons
        const buttons = categoryFiltersContainer.querySelectorAll('.category-filter');
        buttons.forEach(button => {
            button.classList.toggle('active', button.dataset.category === currentCategory);
        });
    }

    function renderCarousel() {
        if (filteredConsoleGames.length === 0) {
            gameCarousel.innerHTML = `<p class="empty-message">No se encontraron juegos en la categoría "${currentCategory}".</p>`;
            updateDetails(null);
            return;
        }

        gameCarousel.innerHTML = filteredConsoleGames.map((game, index) => `
            <div class="carousel-item" data-id="${game.id}">
                <a href="consoleplay.html?game=${encodeURIComponent(game.id)}">
                    <img src="${game.thumbnail}" alt="${game.title || game.id}">
                </a>
            </div>
        `).join('');

        updateCarouselVisuals();
    }

    function updateDetails(game) {
        if (!game) {
            detailsBubble.style.opacity = '0';
            return;
        }

        detailsBubble.classList.remove('expanded');
        detailsToggleButton.textContent = 'Detalles';
        detailsBubble.style.opacity = '1';

        detailsTitle.textContent = game.id || 'Título no disponible';

        const fullDescription = game.description || 'Descripción no disponible.';
        const shortDescription = fullDescription.length > 120 ? fullDescription.substring(0, 120) + '...' : fullDescription;

        shortDescriptionContainer.textContent = shortDescription;
        descriptionContainer.innerHTML = `
            <p>${fullDescription}</p>
            <div class="metadata">
                <span><strong>Desarrollador:</strong> ${game.developer || 'No disponible'}</span>
                <span><strong>Motor:</strong> ${game.engine || 'No disponible'}</span>
                <span><strong>Categoría:</strong> ${game.category || 'No disponible'}</span>
                <span><strong>Lanzamiento:</strong> ${game.releaseDate || 'No disponible'}</span>
            </div>
        `;

        controlsContainer.innerHTML = `<h4>Controles</h4><p>${game.controls || 'No especificados.'}</p>`;
    }

    function updateCarouselVisuals() {
        const items = document.querySelectorAll('.carousel-item');
        items.forEach((item, index) => {
            const offset = index - currentGameIndex;
            item.style.setProperty('--offset', offset);

            item.classList.remove('active', 'left', 'right', 'hide-left', 'hide-right');
            if (offset === 0) item.classList.add('active');
            else if (offset === -1) item.classList.add('left');
            else if (offset === 1) item.classList.add('right');
            else if (offset < -1) item.classList.add('hide-left');
            else if (offset > 1) item.classList.add('hide-right');
        });
    }

    // --- EVENT LISTENERS & NAVIGATION ---
    function setupEventListeners() {
        categoryFiltersContainer.addEventListener('click', (event) => {
            if (event.target.matches('.category-filter')) {
                currentCategory = event.target.dataset.category;
                applyCategoryFilter();
            }
        });

        detailsToggleButton.addEventListener('click', () => {
            const isExpanded = detailsBubble.classList.toggle('expanded');
            detailsToggleButton.textContent = isExpanded ? 'Ocultar' : 'Detalles';
        });
    }

    function navigateCarousel(direction) {
        if (filteredConsoleGames.length === 0) return;

        let newIndex;

        if (direction === 'next') {
            const lastIndex = filteredConsoleGames.length - 1;
            const isAtEnd = currentGameIndex === lastIndex;
            newIndex = isAtEnd ? 0 : currentGameIndex + 1;
        } else if (direction === 'prev') {
            const isAtStart = currentGameIndex === 0;
            newIndex = isAtStart ? filteredConsoleGames.length - 1 : currentGameIndex - 1;
        } else {
            return;
        }

        currentGameIndex = newIndex;
        updateCarouselVisuals();
        updateDetails(filteredConsoleGames[currentGameIndex]);
    }

    // --- GAMEPAD SUPPORT ---
    function setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadConnected = true;
            console.log('Gamepad connected:', e.gamepad.id);
            requestAnimationFrame(handleGamepadInput);
        });

        window.addEventListener('gamepaddisconnected', () => {
            gamepadConnected = false;
            console.log('Gamepad disconnected');
        });

        if (navigator.getGamepads().some(g => g)) {
            gamepadConnected = true;
            requestAnimationFrame(handleGamepadInput);
        }
    }

    function handleGamepadInput() {
        if (!gamepadConnected) return;

        const gamepads = navigator.getGamepads();
        if (!gamepads[0]) return;
        const gamepad = gamepads[0];

        const isButtonPressed = (buttonIndex) => {
            if (gamepad.buttons[buttonIndex] && gamepad.buttons[buttonIndex].pressed) {
                if (!buttonPressStates[buttonIndex]) {
                    buttonPressStates[buttonIndex] = true;
                    return true;
                }
            } else {
                buttonPressStates[buttonIndex] = false;
            }
            return false;
        };

        if (isButtonPressed(15) || gamepad.axes[0] > 0.8) {
            navigateCarousel('next');
        } else if (isButtonPressed(14) || gamepad.axes[0] < -0.8) {
            navigateCarousel('prev');
        }

        if (isButtonPressed(0)) {
            const activeItem = document.querySelector('.carousel-item.active a');
            if (activeItem) {
                activeItem.click();
            }
        }

        requestAnimationFrame(handleGamepadInput);
    }

    // --- START THE APP ---
    init();
});
