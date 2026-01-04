document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const gameContainer = document.getElementById('game-container');
    const errorMessage = document.getElementById('error-message');
    const floatingMenu = document.getElementById('floating-menu');
    const restartBtn = document.getElementById('restart-btn');
    const returnBtn = document.getElementById('return-btn');

    // --- STATE ---
    let gameId = null;
    let menuVisible = false;
    let gamepadConnected = false;
    let buttonPressStates = {};

    // --- INITIALIZATION ---
    function init() {
        const urlParams = new URLSearchParams(window.location.search);
        gameId = urlParams.get('game');

        if (gameId && allGames[gameId]) {
            loadGame();
        } else {
            showError();
        }

        setupEventListeners();
        setupGamepadListeners();
    }

    // --- GAME LOADING ---
    function loadGame() {
        if (!gameId || !allGames[gameId]) {
            showError("ID de juego no válido.");
            return;
        }

        const gamePath = allGames[gameId].path;

        if (gamePath) {
            gameContainer.innerHTML = `<iframe src="${gamePath}" frameborder="0"></iframe>`;
        } else {
            showError("No se pudo encontrar la ruta del juego.");
        }
    }

    function showError(message = "¡Ups! Ocurrió un error al cargar el juego. Lo sentimos.") {
        gameContainer.classList.add('hidden');
        errorMessage.textContent = message;
        errorMessage.classList.remove('hidden');
    }

    // --- MENU LOGIC ---
    function toggleMenu() {
        menuVisible = !menuVisible;
        floatingMenu.classList.toggle('hidden', !menuVisible);
    }

    // --- EVENT LISTENERS ---
    function setupEventListeners() {
        restartBtn.addEventListener('click', () => {
            if(gameId) loadGame();
            toggleMenu();
        });

        returnBtn.addEventListener('click', () => {
            window.location.href = 'console.html';
        });
    }

    // --- GAMEPAD SUPPORT ---
    function setupGamepadListeners() {
        window.addEventListener('gamepadconnected', (e) => {
            gamepadConnected = true;
            requestAnimationFrame(handleGamepadInput);
        });

        window.addEventListener('gamepaddisconnected', () => {
            gamepadConnected = false;
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

        // Menu button (e.g., 'Mode' or 'Start' button, often index 9 or 8)
        if (isButtonPressed(9) || isButtonPressed(8)) {
            toggleMenu();
        }

        if (menuVisible) {
            // Navigate menu items (simple up/down)
            // For now, let's just use A for restart and B for return
            if (isButtonPressed(0)) { // 'A' button
                restartBtn.click();
            }
            if (isButtonPressed(1)) { // 'B' button
                returnBtn.click();
            }
        }

        requestAnimationFrame(handleGamepadInput);
    }

    // --- START THE APP ---
    init();
});
