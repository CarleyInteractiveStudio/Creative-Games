// Mock Data for Games
const GAMES_DATA = [
    {
        id: 1,
        title: "Cyberpunk Drift",
        category: "Acción",
        rating: 4.8,
        image: "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80",
        compatibility: ["pc", "console"]
    },
    {
        id: 2,
        title: "Medieval Quest",
        category: "Aventura",
        rating: 4.5,
        image: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
        compatibility: ["pc", "console", "tv"]
    },
    {
        id: 3,
        title: "Space Explorer",
        category: "Estrategia",
        rating: 4.2,
        image: "https://images.unsplash.com/photo-1614732414444-096e5f1122d5?auto=format&fit=crop&w=800&q=80",
        compatibility: ["pc", "mobile"]
    },
    {
        id: 4,
        title: "Urban Football 24",
        category: "Deportes",
        rating: 4.7,
        image: "https://images.unsplash.com/photo-1552667466-07f704029194?auto=format&fit=crop&w=800&q=80",
        compatibility: ["pc", "console", "mobile", "tv"]
    },
    {
        id: 5,
        title: "Neon Racing",
        category: "Acción",
        rating: 4.9,
        image: "https://images.unsplash.com/photo-1511884642898-4c92249e20b6?auto=format&fit=crop&w=800&q=80",
        compatibility: ["mobile", "tv", "console"]
    },
    {
        id: 6,
        title: "Shadow Blade",
        category: "Aventura",
        rating: 4.6,
        image: "https://images.unsplash.com/photo-1580234811497-9df7fd2f357e?auto=format&fit=crop&w=800&q=80",
        compatibility: ["pc", "console"]
    }
];

const CATEGORIES = [
    "Acción", "Aventura", "Disparos", "Simulación", "Estrategia",
    "Deportes", "Puzzle", "Arcade", "Terror", "RPG",
    "Carreras", "Cooperativo", "Multijugador", "Indie"
];

// State Management
let allGames = [];
let filteredGames = [];

// DOM Elements
const sectionsContainer = document.getElementById('sections-container');
const searchInput = document.getElementById('game-search');
const logoMenuBtn = document.getElementById('logo-menu-btn');
const logoDropdown = document.getElementById('logo-dropdown');
const categoriesList = document.getElementById('categories-list');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

async function initApp() {
    await renderCategories();

    // Check Auth State for Profile Bar
    checkUserAuth();

    // Load Recommendations if logged in
    const recommendations = await getRecommendedGames();
    if (recommendations.length > 0) {
        renderRecommendationSection(recommendations);
    }

    // Load from Supabase
    try {
        const dbGames = await getApprovedGames();
        if (dbGames && dbGames.length > 0) {
            allGames = dbGames.map(g => ({
                id: g.id,
                title: g.title,
                category: (g.categories && g.categories.length > 0) ? g.categories[0] : 'Otros',
                rating: g.rating || 0,
                image_url: g.image_url || 'https://via.placeholder.com/800x450?text=No+Image',
                devices: g.devices || []
            }));
        }
    } catch (e) {
        console.warn('Supabase not available, using empty list');
        allGames = [];
    }

    renderSections(allGames);
    setupEventListeners();
    initGamepadSupport();
}

async function checkUserAuth() {
    // Update profile icon if logged in
    const session = await getSession();
    if (session) {
        const btn = document.querySelector('.profile-btn');
        if (btn) btn.title = `Cuenta: ${session.user.email}`;
    }
}

function setupEventListeners() {
    // Search Filtering
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        filteredGames = allGames.filter(game =>
            game.title.toLowerCase().includes(term) ||
            game.category.toLowerCase().includes(term)
        );
        renderSections(filteredGames);
    });

    // Logo Menu Toggle
    logoMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        logoDropdown.classList.toggle('hidden');
    });

    // Device filters in main page
    window.filterByDevice = filterByDevice;
    window.filterByCategory = filterByCategory;

    // Close dropdown on click outside
    document.addEventListener('click', () => {
        logoDropdown.classList.add('hidden');
    });

    logoDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });

}

async function renderCategories() {
    const cats = await getCategories();
    const list = cats.length > 0 ? cats : CATEGORIES;
    categoriesList.innerHTML = list.map(cat => `
        <li><a href="#" class="dropdown-item" onclick="filterByCategory('${cat}')">${cat}</a></li>
    `).join('');
}

function filterByCategory(cat) {
    filteredGames = allGames.filter(game =>
        game.category === cat || (game.categories && game.categories.includes(cat))
    );
    renderSections(filteredGames);
}

async function filterByDevice(device) {
    const dbGames = await getApprovedGames({ device: device });
    const mapped = dbGames.map(g => ({
        id: g.id,
        title: g.title,
        category: (g.categories && g.categories.length > 0) ? g.categories[0] : 'Otros',
        rating: g.rating || 0,
        image_url: g.image_url || 'https://via.placeholder.com/800x450?text=No+Image',
        devices: g.devices || []
    }));
    renderSections(mapped);
}

function renderSections(games) {
    if (games.length === 0) {
        sectionsContainer.innerHTML = '<div class="loading-spinner">No se encontraron juegos.</div>';
        return;
    }

    // Group games by category for sections
    const grouped = games.reduce((acc, game) => {
        const cat = game.category || 'Otros';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(game);
        return acc;
    }, {});

    let html = '';

    // Custom sections logic
    for (const [category, categoryGames] of Object.entries(grouped)) {
        html += `
            <section class="game-section">
                <h2 class="section-title">${category}</h2>
                <div class="scroll-container">
                    ${categoryGames.map(game => createGameCard(game)).join('')}
                </div>
            </section>
        `;
    }

    sectionsContainer.innerHTML = html;
}

function renderRecommendationSection(games) {
    const sectionHtml = `
        <section class="game-section recommendation-section">
            <h2 class="section-title gold-text">Recomendados para ti</h2>
            <div class="scroll-container">
                ${games.map(game => {
                    // Map DB game to card format
                    const cardGame = {
                        id: game.id,
                        title: game.title,
                        rating: game.rating,
                        image_url: game.image_url,
                        devices: game.devices
                    };
                    return createGameCard(cardGame);
                }).join('')}
            </div>
        </section>
    `;
    sectionsContainer.insertAdjacentHTML('afterbegin', sectionHtml);
}

function createGameCard(game) {
    const compIcons = (game.devices || []).map(device => `
        <img src="images/icons/${device}.svg" alt="${device}" class="comp-icon" title="${device}">
    `).join('');

    // PC/TV/Mobile games go to juego.html
    // Console games go to juego-consola.html (if specifically selected in console mode)
    // For main page, we use juego.html
    return `
        <div class="game-card" onclick="location.href='juego.html?id=${game.id}'">
            <div class="game-thumb-container">
                <img src="${game.image_url}" alt="${game.title}" class="game-thumb" loading="lazy">
            </div>
            <div class="game-info">
                <h3 class="game-title">${game.title}</h3>
                <div class="game-meta">
                    <span class="rating">${game.rating}</span>
                    <div class="compatibility-icons">
                        ${compIcons}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function playGame(id) {
    console.log(`Iniciando juego ID: ${id}`);
    // Futura implementación de página de juego
}

// Gamepad Support for Main Page
let mainFocusIndex = 0;
let lastButtonsMain = {};
let mainFocusables = [];

function initGamepadSupport() {
    window.addEventListener("gamepadconnected", () => {
        console.log("Gamepad connected to main page");
        mainGamepadLoop();
    });

    // Proactive check
    const gps = navigator.getGamepads();
    if (gps[0]) mainGamepadLoop();
}

function mainGamepadLoop() {
    const gps = navigator.getGamepads();
    if (!gps[0]) return;
    const gp = gps[0];

    const pressed = (btnIndex) => {
        const isPressed = gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed;
        const wasPressed = lastButtonsMain[btnIndex];
        lastButtonsMain[btnIndex] = isPressed;
        return isPressed && !wasPressed;
    };

    const stickMoved = (axis, dir) => {
        const val = gp.axes[axis];
        const key = `axis_${axis}_${dir}`;
        const threshold = 0.5;
        const isMoved = dir > 0 ? val > threshold : val < -threshold;
        const wasMoved = lastButtonsMain[key];
        lastButtonsMain[key] = isMoved;
        return isMoved && !wasMoved;
    };

    const UP = pressed(12) || stickMoved(1, -1);
    const DOWN = pressed(13) || stickMoved(1, 1);
    const LEFT = pressed(14) || stickMoved(0, -1);
    const RIGHT = pressed(15) || stickMoved(0, 1);
    const A = pressed(0);

    updateMainFocusables();

    if (UP) {
        // Complex vertical logic: find nearest element above
        mainFocusIndex = findNearestVertical(mainFocusIndex, -1);
    }
    if (DOWN) {
        mainFocusIndex = findNearestVertical(mainFocusIndex, 1);
    }
    if (LEFT) mainFocusIndex = Math.max(0, mainFocusIndex - 1);
    if (RIGHT) mainFocusIndex = Math.min(mainFocusables.length - 1, mainFocusIndex + 1);

    if (A && mainFocusables[mainFocusIndex]) {
        mainFocusables[mainFocusIndex].click();
    }

    applyMainFocus();
    requestAnimationFrame(mainGamepadLoop);
}

function updateMainFocusables() {
    // Collect all visible interactive elements
    const elements = Array.from(document.querySelectorAll('input, button, a, .game-card, .logo-container'));
    mainFocusables = elements.filter(el => {
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && !el.closest('.hidden');
    });
}

function applyMainFocus() {
    mainFocusables.forEach((el, i) => {
        if (i === mainFocusIndex) {
            el.classList.add('gamepad-focused');
            if (el.classList.contains('game-card')) {
                el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            }
        } else {
            el.classList.remove('gamepad-focused');
        }
    });
}

function findNearestVertical(currentIndex, dir) {
    const current = mainFocusables[currentIndex];
    if (!current) return 0;
    const currentRect = current.getBoundingClientRect();

    let bestDist = Infinity;
    let bestIndex = currentIndex;

    mainFocusables.forEach((el, i) => {
        if (i === currentIndex) return;
        const rect = el.getBoundingClientRect();

        // Vertical check
        const isAbove = rect.bottom <= currentRect.top;
        const isBelow = rect.top >= currentRect.bottom;

        if ((dir === -1 && isAbove) || (dir === 1 && isBelow)) {
            // Calculate distance between centers
            const dx = (rect.left + rect.width/2) - (currentRect.left + currentRect.width/2);
            const dy = (rect.top + rect.height/2) - (currentRect.top + currentRect.height/2);
            const dist = dx*dx + dy*dy;

            if (dist < bestDist) {
                bestDist = dist;
                bestIndex = i;
            }
        }
    });

    return bestIndex;
}