document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const categoryFiltersContainer = document.getElementById('category-filters');
    const gameCarousel = document.getElementById('game-carousel');
    const detailsBubble = document.getElementById('game-details-bubble');
    const descriptionContainer = document.getElementById('details-description');
    const shortDescriptionContainer = document.getElementById('details-short-description');
    const controlsContainer = document.getElementById('details-controls');
    const detailsTitle = document.getElementById('details-title');
    const detailsToggleButton = document.getElementById('details-toggle-btn');

    // --- MAIN APP LOGIC ---
    let allConsoleGames = [];
    let filteredConsoleGames = [];
    let currentGameIndex = 0;
    let currentCategory = 'Todo';
    let buttonPressStates = {};
    let gamepadConfig = null; // We still need this to store the config once read.

    function init() {
        // Attempt to load gamepad config from localStorage
        const savedConfig = localStorage.getItem('gamepadConfig');
        if (savedConfig) {
            gamepadConfig = JSON.parse(savedConfig);
        } else {
            // Fallback to a default configuration if none is saved
            console.warn("No gamepad configuration found. Falling back to default.");
            gamepadConfig = {
                family: "Default Fallback",
                mapping: { accept: 0, back: 1, mode: 16, up: 12, down: 13, left: 14, right: 15, leftStick_X: 0, leftStick_Y: 1, rightStick_X: 2, rightStick_Y: 3 }
            };
        }

        // Start the main application logic
        initMainApp();

        // Listen for gamepad connections to start polling for input.
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected:', e.gamepad.id);
            // Start polling for input
            requestAnimationFrame(pollGamepad);
        });

        window.addEventListener('gamepaddisconnected', () => {
            console.log('Gamepad disconnected');
            // We can stop polling if we want, but it's harmless to keep it running
        });
    }

    function initMainApp() {
        allConsoleGames = Object.entries(allGames)
            .filter(([id, game]) => game.platforms.includes('console'))
            .map(([id, game]) => ({ ...game, id }));

        populateCategoryFilters();
        applyCategoryFilter();
        setupEventListeners();

        // If a gamepad is already connected on page load, start polling.
        if (navigator.getGamepads().some(g => g)) {
            requestAnimationFrame(pollGamepad);
        }
    }

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
        const buttons = categoryFiltersContainer.querySelectorAll('.category-filter');
        buttons.forEach(button => button.classList.toggle('active', button.dataset.category === currentCategory));
    }

    function renderCarousel() {
        if (filteredConsoleGames.length === 0) {
            gameCarousel.innerHTML = `<p class="empty-message">No se encontraron juegos.</p>`;
            updateDetails(null);
            return;
        }
        gameCarousel.innerHTML = filteredConsoleGames.map((game) => `
            <div class="carousel-item" data-id="${game.id}">
                <a href="consoleplay.html?game=${encodeURIComponent(game.id)}">
                    <img src="${game.thumbnail}" alt="${game.id}">
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
        detailsTitle.textContent = game.id;
        const fullDesc = game.description || 'No disponible.';
        shortDescriptionContainer.textContent = fullDesc.substring(0, 120) + (fullDesc.length > 120 ? '...' : '');
        descriptionContainer.innerHTML = `<p>${fullDesc}</p>`;
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

    function setupEventListeners() {
        categoryFiltersContainer.addEventListener('click', (e) => {
            if (e.target.matches('.category-filter')) {
                currentCategory = e.target.dataset.category;
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
        const newIndex = (currentGameIndex + (direction === 'next' ? 1 : -1) + filteredConsoleGames.length) % filteredConsoleGames.length;
        currentGameIndex = newIndex;
        updateCarouselVisuals();
        updateDetails(filteredConsoleGames[currentGameIndex]);
    }

    // --- GAMEPAD HANDLING ---
    function isButtonPressed(button) {
        if (!button) return false;
        const buttonIndex = button.index; // This needs to be derived correctly. Let's assume the button object has an index.

        // This is tricky without knowing the button object structure. Let's find index by reference.
        const gamepad = navigator.getGamepads()[0];
        if (!gamepad) return false;

        const realIndex = Array.from(gamepad.buttons).indexOf(button);
        if (realIndex === -1) return false; // Button not found

        if (button.pressed) {
            if (!buttonPressStates[realIndex]) {
                buttonPressStates[realIndex] = true;
                return true;
            }
        } else {
            buttonPressStates[realIndex] = false;
        }
        return false;
    }

    function pollGamepad() {
        const gamepad = navigator.getGamepads()[0];
        if (!gamepad) {
            requestAnimationFrame(pollGamepad);
            return;
        };

        handleMainAppGamepadInput(gamepad);

        requestAnimationFrame(pollGamepad);
    }

    function handleMainAppGamepadInput(gamepad) {
        if (!gamepadConfig || !gamepad) return;

        const mapping = gamepadConfig.mapping;

        // Carousel Navigation
        if (isButtonPressed(gamepad.buttons[mapping.right]) || (gamepad.axes[mapping.leftStick_X] > 0.8)) {
            if (!buttonPressStates['axis_right']) {
                navigateCarousel('next');
                buttonPressStates['axis_right'] = true;
            }
        } else {
             buttonPressStates['axis_right'] = false;
        }

        if (isButtonPressed(gamepad.buttons[mapping.left]) || (gamepad.axes[mapping.leftStick_X] < -0.8)) {
             if (!buttonPressStates['axis_left']) {
                navigateCarousel('prev');
                buttonPressStates['axis_left'] = true;
            }
        } else {
             buttonPressStates['axis_left'] = false;
        }

        // Action button
        if (isButtonPressed(gamepad.buttons[mapping.accept])) {
            document.querySelector('.carousel-item.active a')?.click();
        }
    }

    // --- START THE APP ---
    init();
});
