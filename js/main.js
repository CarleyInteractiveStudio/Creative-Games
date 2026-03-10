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
                user_id_raw: g.user_id,
                title: g.title,
                    author: g.profiles?.full_name || g.profiles?.username || 'Usuario',
                category: (g.categories && g.categories.length > 0) ? g.categories[0] : 'Otros',
                rating: g.rating || 0,
                image_url: fixGitHubImageUrl(g.image_url) || 'https://via.placeholder.com/800x450?text=No+Image',
                    devices: g.devices || [],
                    created_at: g.created_at
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

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function checkUserAuth() {
    const session = await getSession();
    if (session) {
        const profileBtn = document.querySelector('.profile-btn');
        if (profileBtn) {
            profileBtn.title = `Cuenta: ${session.user.email}`;
            const avatarUrl = session.user.user_metadata.avatar_url;
            if (avatarUrl) {
                profileBtn.innerHTML = `<img src="${avatarUrl}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
            }
        }

        // Show notification container
        const notifContainer = document.getElementById('notif-container');
        if (notifContainer) {
            notifContainer.classList.remove('hidden');
            loadNotificationsUI();
        }
    }
}

async function loadNotificationsUI() {
    const notifBtn = document.getElementById('notif-btn');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifList = document.getElementById('notif-list');
    const notifCount = document.getElementById('notif-count');

    const notifs = await getNotifications();
    const unread = notifs.filter(n => !n.is_read);

    if (unread.length > 0) {
        notifCount.textContent = unread.length;
        notifCount.classList.remove('hidden');
    } else {
        notifCount.classList.add('hidden');
    }

    if (notifs.length > 0) {
        notifList.innerHTML = notifs.map(n => `
            <div class="notif-item ${n.is_read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}', '${n.game_id}')">
                <div class="notif-title">${escapeHTML(n.title)}</div>
                <div class="notif-content">${escapeHTML(n.content)}</div>
                <div class="notif-date">${new Date(n.created_at).toLocaleString()}</div>
            </div>
        `).join('');
    }

    notifBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        notifDropdown.classList.toggle('hidden');
    });

    document.addEventListener('click', () => {
        notifDropdown.classList.add('hidden');
    });
}

window.handleNotifClick = async (id, gameId) => {
    await markNotificationRead(id);
    if (gameId && gameId !== 'null') {
        window.location.href = `juego.html?id=${gameId}`;
    } else {
        loadNotificationsUI();
    }
};

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
        image_url: fixGitHubImageUrl(g.image_url) || 'https://via.placeholder.com/800x450?text=No+Image',
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
                        user_id_raw: game.user_id,
                        title: game.title,
                        author: game.profiles?.full_name || game.profiles?.username || 'Usuario',
                        rating: game.rating,
                        image_url: fixGitHubImageUrl(game.image_url),
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

    // New/Updated Badges
    const createdDate = new Date(game.created_at);
    const now = new Date();
    const isNew = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24)) <= 7;

    return `
        <div class="game-card">
            <div class="game-thumb-container" onclick="location.href='juego.html?id=${game.id}'">
                ${isNew ? '<span class="card-badge">NUEVO</span>' : ''}
                <img src="${game.image_url}" alt="${escapeHTML(game.title)}" class="game-thumb" loading="lazy">
            </div>
            <div class="game-info">
                <h3 class="game-title" onclick="location.href='juego.html?id=${game.id}'">${escapeHTML(game.title)}</h3>
                <div class="author-label" onclick="event.stopPropagation(); location.href='perfil.html?id=${game.user_id_raw || ''}'">por ${escapeHTML(game.author) || 'Usuario'}</div>
                <div class="game-meta">
                    <span class="rating">${Number(game.rating).toFixed(1)}</span>
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