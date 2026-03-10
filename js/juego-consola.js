let gameId = null;
let gameData = null;
let isPaused = false;
let pauseIndex = 0;
let lastButtons = {};
let gamepadType = localStorage.getItem('gp_type') || 'xbox';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    gameId = urlParams.get('id');

    if (!gameId) {
        window.location.href = 'consola.html';
        return;
    }

    await loadGameData();
    updatePauseHints();
    trackPlayTime(gameId);
    gamepadLoop();
});

async function loadGameData() {
    try {
        const { data: game, error } = await sbClient
            .from('games')
            .select('*')
            .eq('id', gameId)
            .single();

        if (error || !game) throw error;

        gameData = game;
        document.title = `${game.title} - Console Mode`;
        document.getElementById('loading-title').textContent = game.title;
        document.getElementById('pause-game-title').textContent = game.title;

        const frame = document.getElementById('game-frame');
        frame.src = game.repo_url;

        frame.onload = () => {
            setTimeout(() => {
                document.getElementById('loading-screen').classList.add('hidden');
            }, 1000);
        };

    } catch (err) {
        console.error('Error loading game:', err);
        window.location.href = 'consola.html';
    }
}

function gamepadLoop() {
    const gps = navigator.getGamepads();
    if (!gps[0]) {
        requestAnimationFrame(gamepadLoop);
        return;
    }
    const gp = gps[0];

    const pressed = (btnIndex) => {
        const isPressed = gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed;
        const wasPressed = lastButtons[btnIndex];
        lastButtons[btnIndex] = isPressed;
        return isPressed && !wasPressed;
    };

    const stickMoved = (axis, dir) => {
        const val = gp.axes[axis];
        const key = `axis_${axis}_${dir}`;
        const threshold = 0.5;
        const isMoved = dir > 0 ? val > threshold : val < -threshold;
        const wasMoved = lastButtons[key];
        lastButtons[key] = isMoved;
        return isMoved && !wasMoved;
    };

    const UP = pressed(12) || stickMoved(1, -1);
    const DOWN = pressed(13) || stickMoved(1, 1);
    const A = pressed(0);
    const B = pressed(1);
    const START = pressed(9) || pressed(16); // Start or Home

    if (START) {
        togglePause();
    }

    if (isPaused) {
        if (UP) {
            pauseIndex = (pauseIndex - 1 + 3) % 3;
            updatePauseFocus();
        }
        if (DOWN) {
            pauseIndex = (pauseIndex + 1) % 3;
            updatePauseFocus();
        }
        if (A) {
            handlePauseSelection();
        }
        if (B) {
            togglePause();
        }
    }

    requestAnimationFrame(gamepadLoop);
}

function togglePause() {
    isPaused = !isPaused;
    const menu = document.getElementById('pause-menu');
    if (isPaused) {
        menu.classList.remove('hidden');
        pauseIndex = 0;
        updatePauseFocus();
    } else {
        menu.classList.add('hidden');
    }
}

function updatePauseFocus() {
    const btns = document.querySelectorAll('.pause-btn');
    btns.forEach((btn, i) => {
        if (i === pauseIndex) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function handlePauseSelection() {
    if (pauseIndex === 0) { // Resume
        togglePause();
    } else if (pauseIndex === 1) { // Restart
        const frame = document.getElementById('game-frame');
        frame.src = frame.src;
        togglePause();
    } else if (pauseIndex === 2) { // Exit
        window.location.href = 'consola.html';
    }
}

function updatePauseHints() {
    const container = document.getElementById('pause-hints');
    const isX = gamepadType === 'xbox';

    const icons = {
        a: isX ? 'btn_a.svg' : 'btn_cross.svg',
        b: isX ? 'btn_b.svg' : 'btn_circle.svg'
    };

    container.innerHTML = `
        <div class="hint-item">
            <img src="images/icons/${icons.a}" class="hint-icon">
            <span>Seleccionar</span>
        </div>
        <div class="hint-item">
            <img src="images/icons/${icons.b}" class="hint-icon">
            <span>Volver</span>
        </div>
    `;
}

let sessionStartTime = null;
let currentPlaySessionId = null;

async function trackPlayTime(gameId) {
    sessionStartTime = Date.now();
    try {
        currentPlaySessionId = await startPlaySession(gameId, 'console');
    } catch (e) {
        console.warn('Analytics disabled');
    }

    window.addEventListener('beforeunload', async () => {
        if (currentPlaySessionId && sessionStartTime) {
            const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
            await endPlaySession(currentPlaySessionId, duration);
        }
    });
}
