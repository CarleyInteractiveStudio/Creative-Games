// --- GAMEPAD IDENTIFICATION WIZARD (GLOBAL SCOPE FOR TESTING) ---
let wizardState = {};

function initGamepadWizard() {
    const modal = document.getElementById('gamepad-wizard-modal');
    if (!modal) return;

    // Reset state
    wizardState = {};

    // Show the modal
    modal.classList.remove('hidden');
    showWizardStep('wizard-step-1');

    // Attach listeners for the first step
    const typeButtons = modal.querySelectorAll('#wizard-step-1 .controller-type-selection button');
    typeButtons.forEach(button => {
        button.addEventListener('click', () => {
            wizardState.type = button.dataset.type;
            if (wizardState.type === 'simple') {
                // Simple controllers have a straightforward mapping
                concludeWizard({ family: 'Retro/Simple', reason: 'Selección de mando simple.', layout: 'Simple' });
            } else {
                askSymbolOrLetter();
            }
        });
    });
}

function showWizardStep(stepId) {
    const modal = document.getElementById('gamepad-wizard-modal');
    modal.querySelectorAll('.wizard-step').forEach(step => {
        step.classList.remove('active');
    });
    document.getElementById(stepId).classList.add('active');
}

function generateStepContent(stepId, title, question, options) {
    const stepContainer = document.getElementById(stepId);
    let optionsHTML = options.map(opt =>
        `<button data-value="${opt.value}">${opt.text}</button>`
    ).join('');

    stepContainer.innerHTML = `
        <h2>${title}</h2>
        <p>${question}</p>
        <div class="wizard-options">
            ${optionsHTML}
        </div>
    `;

    // Attach listeners to the newly created buttons
    stepContainer.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
            options.find(o => o.value === button.dataset.value).action();
        });
    });

    showWizardStep(stepId);
}

function askSymbolOrLetter() {
    wizardState.step = 'symbolOrLetter';
    generateStepContent('wizard-step-2', 'Identificación de Mando', 'En los botones de acción de la derecha, ¿ves símbolos geométricos o letras?', [
        { value: 'symbols', text: 'Veo Símbolos (△, ○, ✕, □)', action: () => {
            concludeWizard({ family: 'PlayStation', reason: 'Botones con símbolos geométricos.', layout: 'PlayStation Standard' });
        }},
        { value: 'letters', text: 'Veo Letras (A, B, X, Y)', action: () => {
            wizardState.buttonType = 'letters';
            askAButtonPosition();
        }}
    ]);
}

function askAButtonPosition() {
    wizardState.step = 'aButtonPosition';
    generateStepContent('wizard-step-2', 'Identificación de Mando', '¿En qué posición se encuentra el botón "A"?', [
        { value: 'bottom', text: 'La "A" está en la posición de abajo.', action: () => {
            wizardState.aPosition = 'bottom';
            askJoystickLayout();
        }},
        { value: 'right', text: 'La "A" está en la posición de la derecha.', action: () => {
             concludeWizard({ family: 'Nintendo', reason: 'Letra "A" en la posición derecha.', layout: 'Nintendo Standard' });
        }}
    ]);
}

function askJoystickLayout() {
     wizardState.step = 'joystickLayout';
     generateStepContent('wizard-step-3', 'Identificación de Mando', '¿Cómo están posicionadas las palancas o "joysticks"?', [
        { value: 'asymmetric', text: 'Asimétricos (izquierdo arriba, derecho abajo)', action: () => {
            concludeWizard({ family: 'Xbox', reason: 'Letra "A" abajo y joysticks asimétricos.', layout: 'Xbox Standard' });
        }},
        { value: 'symmetric', text: 'Simétricos (ambos a la misma altura, abajo)', action: () => {
             concludeWizard({ family: 'PlayStation', reason: 'Letra "A" abajo (estándar occidental) y joysticks simétricos.', layout: 'PlayStation Standard' });
        }}
    ]);
}

function concludeWizard(result) {
    const resultContainer = document.getElementById('wizard-result');
    resultContainer.innerHTML = `
        <h2>¡Mando Identificado!</h2>
        <p>Hemos determinado que tu mando es de la siguiente familia:</p>
        <div class="result-details">
            <p><strong>Familia:</strong> ${result.family}</p>
            <p><strong>Razón:</strong> ${result.reason}</p>
            <p><strong>Configuración:</strong> ${result.layout}</p>
        </div>
        <button id="save-wizard-config" class="cta-button">Guardar y Continuar</button>
    `;
    showWizardStep('wizard-result');

    document.getElementById('save-wizard-config').addEventListener('click', () => {
        saveGamepadConfig(result.family);
        document.getElementById('gamepad-wizard-modal').classList.add('hidden');
    });
}

function saveGamepadConfig(family) {
    let config = {
        family: family,
        mapping: {}
    };

    // Standard button mappings based on identified family
    switch (family) {
        case 'Xbox':
        case 'PlayStation': // Assuming 'A'/'X' for accept is the same index
            config.mapping = { accept: 0, back: 1, mode: 16, up: 12, down: 13, left: 14, right: 15, leftStick_X: 0, leftStick_Y: 1 };
            break;
        case 'Nintendo':
            config.mapping = { accept: 0, back: 1, mode: 16, up: 12, down: 13, left: 14, right: 15, leftStick_X: 0, leftStick_Y: 1 };
            break;
         case 'Retro/Simple':
            config.mapping = { accept: 0, back: 1, up: 12, down: 13, left: 14, right: 15, leftStick_X: 0, leftStick_Y: 1 }; // No mode button assumed
            break;
        default:
             config.mapping = { accept: 0, back: 1, mode: 16, up: 12, down: 13, left: 14, right: 15, leftStick_X: 0, leftStick_Y: 1 };
    }

    localStorage.setItem('gamepadConfig', JSON.stringify(config));
    console.log('Gamepad configuration saved:', config);
}


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
    let gamepadConfig = null;

    function setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadConnected = true;
            console.log('Gamepad connected:', e.gamepad.id);

            // Check for existing config, otherwise start wizard
            const savedConfig = localStorage.getItem('gamepadConfig');
            if (!savedConfig) {
                initGamepadWizard();
            } else {
                gamepadConfig = JSON.parse(savedConfig);
                console.log('Loaded gamepad config:', gamepadConfig);
                requestAnimationFrame(handleGamepadInput);
            }
        });

        window.addEventListener('gamepaddisconnected', () => {
            gamepadConnected = false;
            console.log('Gamepad disconnected');
        });

        // Check if a gamepad is already connected on page load
        if (navigator.getGamepads().some(g => g)) {
             window.dispatchEvent(new Event('gamepadconnected', {bubbles:true, detail: {gamepad: navigator.getGamepads().find(g=>g)} }));
        }
    }

    function handleGamepadInput() {
        if (!gamepadConnected || !gamepadConfig) return;

        const gamepads = navigator.getGamepads();
        if (!gamepads[0]) return;
        const gamepad = gamepads[0];
        const mapping = gamepadConfig.mapping;

        const isButtonPressed = (buttonIndex) => {
            if (buttonIndex === undefined) return false;
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

        // Navigation using mapped buttons
        if (isButtonPressed(mapping.right) || (mapping.leftStick_X !== undefined && gamepad.axes[mapping.leftStick_X] > 0.8)) {
            navigateCarousel('next');
        } else if (isButtonPressed(mapping.left) || (mapping.leftStick_X !== undefined && gamepad.axes[mapping.leftStick_X] < -0.8)) {
            navigateCarousel('prev');
        }

        if (isButtonPressed(mapping.accept)) {
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
