/**
 * Console Mode Engine
 * Handles Gamepad navigation, Virtual Keyboard, and Game Launching
 */

let allGames = [];
let displayedGames = [];
let currentSelectedIndex = 0;
let currentMode = 'list'; // 'list', 'header', 'keyboard', 'pause', 'selector', 'game'
let headerIndex = 0; // 0: Search, 1: Account
let pauseIndex = 0; // 0: Resume, 1: Exit
let gamepadType = 'xbox'; // 'xbox' or 'playstation'
let gamepad = null;
let kbInput = "";
let favorites = [];

// Keyboard layout
const KB_LAYOUT = [
    ['1','2','3','4','5','6','7','8','9','0'],
    ['Q','W','E','R','T','Y','U','I','O','P'],
    ['A','S','D','F','G','H','J','K','L','Ñ'],
    ['Z','X','C','V','B','N','M',' ','.',',']
];
let kbCursor = { x: 0, y: 0 };

// DOM Elements
const gamesList = document.getElementById('console-games-list');
const activeTitle = document.getElementById('active-game-title');
const activeRating = document.getElementById('active-game-rating');
const activeDesc = document.getElementById('active-game-desc');
const searchTrigger = document.getElementById('search-trigger');
const searchTextDisplay = document.getElementById('search-text-display');
const kbOverlay = document.getElementById('virtual-keyboard');
const kbDisplayInput = document.getElementById('kb-input');
const kbKeysContainer = document.getElementById('kb-keys');
const controllerSelector = document.getElementById('controller-selector');
const waitingGamepad = document.getElementById('waiting-gamepad');
const gameViewport = document.getElementById('game-viewport');
const gameFrame = document.getElementById('game-frame');
const pauseMenu = document.getElementById('pause-menu');
const favIcon = document.getElementById('fav-icon');
const profileBtn = document.querySelector('.profile-btn');

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await initConsole();
    initKeyboard();
    setupGamepadListeners();
});

async function initConsole() {
    const session = await getSession();
    if (session) {
        favorites = session.user.user_metadata.favorites || [];
    }

    await loadConsoleGames();

    // Check if gamepad is already connected
    const gps = navigator.getGamepads();
    if (gps[0]) {
        handleGamepadConnected();
    }
}

function handleGamepadConnected() {
    waitingGamepad.classList.add('hidden');

    // Check for saved gamepad preference
    if (localStorage.getItem('gp_type')) {
        gamepadType = localStorage.getItem('gp_type');
        controllerSelector.classList.add('hidden');
        currentMode = 'list';
        updateHints();
        renderGames();
    } else {
        currentMode = 'selector';
        controllerSelector.classList.remove('hidden');
        updateSelectorFocus();
    }

    gamepadLoop();
}

async function loadConsoleGames() {
    try {
        allGames = await getGames();
        // Filter only console-compatible
        allGames = allGames.filter(g => g.compatibility && g.compatibility.includes('console'));

        if (allGames.length === 0) {
            // Fallback to mock with console compatibility
            allGames = [
                { id: 1, title: "Cyberpunk Drift", rating: 4.8, description: "Explora una ciudad futurista en este juego de carreras de alta velocidad.", image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80" },
                { id: 2, title: "Medieval Quest", rating: 4.5, description: "Un RPG épico en un mundo lleno de dragones y castillos.", image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80" },
                { id: 5, title: "Neon Racing", rating: 4.9, description: "Carreras retro-futuristas con una banda sonora synthwave.", image: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=800&q=80" }
            ];
        }
    } catch (e) {
        console.error(e);
    }
    displayedGames = [...allGames];
    renderGames();
}

function renderGames() {
    if (displayedGames.length === 0) {
        gamesList.innerHTML = '<div class="no-results">No se encontraron juegos.</div>';
        return;
    }
    gamesList.innerHTML = displayedGames.map((game, index) => `
        <div class="console-game-card ${ (currentMode === 'list' && index === currentSelectedIndex) ? 'selected' : ''}" data-index="${index}">
            <img src="${game.image}" alt="${game.title}">
        </div>
    `).join('');
    updateActiveGame();
}

function updateActiveGame() {
    if (displayedGames.length > 0) {
        const game = displayedGames[currentSelectedIndex];
        activeTitle.textContent = game.title;
        activeRating.textContent = game.rating;
        activeDesc.textContent = game.description || "No hay descripción disponible para este título.";

        // Update favorite status
        if (favorites.includes(game.id)) {
            favIcon.src = 'images/icons/heart_filled.svg';
            favIcon.classList.add('is-fav');
        } else {
            favIcon.src = 'images/icons/heart.svg';
            favIcon.classList.remove('is-fav');
        }

        // Scroll list to selected
        const selected = document.querySelector('.console-game-card.selected');
        if (selected) {
            selected.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

// Keyboard System
function initKeyboard() {
    let html = '';
    KB_LAYOUT.forEach((row, y) => {
        row.forEach((key, x) => {
            html += `<div class="kb-key" data-x="${x}" data-y="${y}">${key === ' ' ? 'Espacio' : key}</div>`;
        });
    });
    kbKeysContainer.innerHTML = html;
    updateKeyboardCursor();
}

function updateKeyboardCursor() {
    document.querySelectorAll('.kb-key').forEach(k => k.classList.remove('selected'));
    const currentKey = document.querySelector(`.kb-key[data-x="${kbCursor.x}"][data-y="${kbCursor.y}"]`);
    if (currentKey) currentKey.classList.add('selected');
}

// Gamepad Logic
function setupGamepadListeners() {
    window.addEventListener("gamepadconnected", (e) => {
        console.log("Gamepad connected");
        handleGamepadConnected();
    });

    window.addEventListener("gamepaddisconnected", (e) => {
        console.log("Gamepad disconnected");
        waitingGamepad.classList.remove('hidden');
        controllerSelector.classList.add('hidden');
        currentMode = 'selector'; // Fallback
    });
}

const BUTTON_A = 0;
const BUTTON_B = 1;
const BUTTON_X = 2;
const BUTTON_Y = 3;
const BUTTON_LB = 4;
const BUTTON_RB = 5;
const BUTTON_LT = 6;
const BUTTON_RT = 7;
const BUTTON_SELECT = 8;
const BUTTON_START = 9;
const BUTTON_UP = 12;
const BUTTON_DOWN = 13;
const BUTTON_LEFT = 14;
const BUTTON_RIGHT = 15;
const BUTTON_HOME = 16;

let lastButtons = {};

function gamepadLoop() {
    const gps = navigator.getGamepads();
    if (!gps[0]) return;
    const gp = gps[0];

    // Detect discrete presses (Rising edge)
    const pressed = (btnIndex) => {
        const isPressed = gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed;
        const wasPressed = lastButtons[btnIndex];
        lastButtons[btnIndex] = isPressed;
        return isPressed && !wasPressed;
    };

    handleInput(pressed, gp.axes);
    requestAnimationFrame(gamepadLoop);
}

function handleInput(pressed, axes) {
    // Stick Deadzone logic for discrete stick movement
    const stickMoved = (axis, dir) => {
        const val = axes[axis];
        const key = `axis_${axis}_${dir}`;
        const threshold = 0.5;
        const isMoved = dir > 0 ? val > threshold : val < -threshold;
        const wasMoved = lastButtons[key];
        lastButtons[key] = isMoved;
        return isMoved && !wasMoved;
    };

    const UP = pressed(BUTTON_UP) || stickMoved(1, -1);
    const DOWN = pressed(BUTTON_DOWN) || stickMoved(1, 1);
    const LEFT = pressed(BUTTON_LEFT) || stickMoved(0, -1);
    const RIGHT = pressed(BUTTON_RIGHT) || stickMoved(0, 1);
    const A = pressed(BUTTON_A);
    const B = pressed(BUTTON_B);
    const X = pressed(BUTTON_X);
    const Y = pressed(BUTTON_Y);
    const START = pressed(BUTTON_START) || pressed(BUTTON_HOME);

    if (currentMode === 'list') {
        if (DOWN) moveSelection(1);
        if (UP) {
            if (currentSelectedIndex === 0) {
                currentMode = 'header';
                updateHeaderFocus();
            } else {
                moveSelection(-1);
            }
        }
        if (A) launchGame();
        if (Y) toggleFav();
    }
    else if (currentMode === 'header') {
        if (DOWN) {
            currentMode = 'list';
            updateHeaderFocus();
            renderGames();
        }
        if (LEFT) { headerIndex = 0; updateHeaderFocus(); }
        if (RIGHT) { headerIndex = 1; updateHeaderFocus(); }
        if (A) {
            if (headerIndex === 0) openKeyboard();
            else window.location.href = 'cuenta.html';
        }
    }
    else if (currentMode === 'selector') {
        if (LEFT || RIGHT) {
            const opts = document.querySelectorAll('.ctrl-opt');
            opts.forEach(o => o.classList.toggle('selected'));
        }
        if (A) {
            const selected = document.querySelector('.ctrl-opt.selected');
            gamepadType = selected.dataset.type;
            localStorage.setItem('gp_type', gamepadType);
            controllerSelector.classList.add('hidden');
            currentMode = 'list';
            updateHints();
        }
    }
    else if (currentMode === 'keyboard') {
        if (DOWN) kbCursor.y = Math.min(kbCursor.y + 1, 3);
        if (UP) kbCursor.y = Math.max(kbCursor.y - 1, 0);
        if (LEFT) kbCursor.x = Math.max(kbCursor.x - 1, 0);
        if (RIGHT) kbCursor.x = Math.min(kbCursor.x + 1, 9);

        if (A) {
            const char = KB_LAYOUT[kbCursor.y][kbCursor.x];
            kbInput += char;
            kbDisplayInput.value = kbInput;
        }
        if (X) { // Delete
            kbInput = kbInput.slice(0, -1);
            kbDisplayInput.value = kbInput;
        }
        if (B) closeKeyboard();
        if (START) performSearch();
        updateKeyboardCursor();
    }
    else if (currentMode === 'game') {
        if (START) togglePause();
    }
    else if (currentMode === 'pause') {
        if (UP) { pauseIndex = 0; updatePauseFocus(); }
        if (DOWN) { pauseIndex = 1; updatePauseFocus(); }
        if (A) {
            if (pauseIndex === 0) togglePause();
            else exitToConsole();
        }
        if (B || START) togglePause();
    }
}

function moveSelection(dir) {
    currentSelectedIndex = (currentSelectedIndex + dir + displayedGames.length) % displayedGames.length;
    renderGames();
}

function updateHeaderFocus() {
    searchTrigger.classList.remove('selected');
    profileBtn.classList.remove('selected');

    if (currentMode === 'header') {
        if (headerIndex === 0) searchTrigger.classList.add('selected');
        else profileBtn.classList.add('selected');

        // Unselect games
        document.querySelectorAll('.console-game-card').forEach(c => c.classList.remove('selected'));
    }
}

function updateSelectorFocus() {
    const opts = document.querySelectorAll('.ctrl-opt');
    opts[0].classList.add('selected');
}

function updatePauseFocus() {
    const btns = document.querySelectorAll('.pause-btn');
    btns.forEach(b => b.classList.remove('active'));
    btns[pauseIndex].classList.add('active');
}

function updateHints() {
    const hints = document.getElementById('nav-hints');
    const isX = gamepadType === 'xbox';

    const icons = {
        a: isX ? 'btn_a.svg' : 'btn_cross.svg',
        b: isX ? 'btn_b.svg' : 'btn_circle.svg',
        x: isX ? 'btn_x.svg' : 'btn_square.svg',
        y: isX ? 'btn_y.svg' : 'btn_triangle.svg',
        start: isX ? 'btn_start.svg' : 'btn_options.svg'
    };

    hints.innerHTML = `
        <div class="hint-item"><img src="images/icons/${icons.a}" class="hint-icon"> <span>Seleccionar</span></div>
        <div class="hint-item"><img src="images/icons/${icons.y}" class="hint-icon"> <span>Favorito</span></div>
        <div class="hint-item"><img src="images/icons/${icons.start}" class="hint-icon"> <span>Pausa</span></div>
    `;

    document.getElementById('kb-hint-delete').src = `images/icons/${icons.x}`;
    document.getElementById('kb-hint-search').src = `images/icons/${icons.start}`;
    document.getElementById('kb-hint-close').src = `images/icons/${icons.b}`;
    document.getElementById('pause-hint-a').src = `images/icons/${icons.a}`;
}

// Actions
async function toggleFav() {
    const game = displayedGames[currentSelectedIndex];
    if (!game) return;

    await toggleFavorite(game.id);
    const session = await getSession();
    if (session) {
        favorites = session.user.user_metadata.favorites || [];
    }
    updateActiveGame();
}

function openKeyboard() {
    kbInput = "";
    kbDisplayInput.value = "";
    kbOverlay.classList.remove('hidden');
    currentMode = 'keyboard';
}

function closeKeyboard() {
    kbOverlay.classList.add('hidden');
    currentMode = 'header';
    updateHeaderFocus();
}

function performSearch() {
    const term = kbInput.toLowerCase().trim();
    if (term === "") {
        displayedGames = [...allGames];
        searchTextDisplay.textContent = "Buscar juegos...";
    } else {
        displayedGames = allGames.filter(g => g.title.toLowerCase().includes(term));
        searchTextDisplay.textContent = `Búsqueda: ${term}`;
    }
    currentSelectedIndex = 0;
    renderGames();
    closeKeyboard();
    currentMode = 'list';
}

function launchGame() {
    const game = displayedGames[currentSelectedIndex];
    if (game) {
        currentMode = 'game';
        gameViewport.classList.remove('hidden');
        // Check metadata for external link, otherwise default
        const url = (game.metadata && game.metadata.external_url) ? game.metadata.external_url : 'https://www.google.com/logos/2010/pacman10-i.html';
        gameFrame.src = url;
    }
}

function togglePause() {
    if (currentMode === 'game') {
        currentMode = 'pause';
        pauseMenu.classList.remove('hidden');
        pauseIndex = 0;
        updatePauseFocus();
    } else if (currentMode === 'pause') {
        currentMode = 'game';
        pauseMenu.classList.add('hidden');
    }
}

function exitToConsole() {
    pauseMenu.classList.add('hidden');
    gameViewport.classList.add('hidden');
    gameFrame.src = 'about:blank';
    currentMode = 'list';
    renderGames();
}