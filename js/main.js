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

const CATEGORIES = ["Acción", "Aventura", "Estrategia", "Deportes", "Puzzle", "Arcade"];

// State Management
let allGames = [...GAMES_DATA];
let filteredGames = [...GAMES_DATA];

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
    renderCategories();

    // Load from Supabase
    try {
        const dbGames = await getGames();
        if (dbGames && dbGames.length > 0) {
            allGames = dbGames;
        }
    } catch (e) {
        console.warn('Supabase not available or empty, using mock data');
    }

    renderSections(allGames);
    setupEventListeners();
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

    // Close dropdown on click outside
    document.addEventListener('click', () => {
        logoDropdown.classList.add('hidden');
    });

    logoDropdown.addEventListener('click', (e) => {
        e.stopPropagation();
    });
}

function renderCategories() {
    categoriesList.innerHTML = CATEGORIES.map(cat => `
        <li><a href="#" class="dropdown-item">${cat}</a></li>
    `).join('');
}

function renderSections(games) {
    if (games.length === 0) {
        sectionsContainer.innerHTML = '<div class="loading-spinner">No se encontraron juegos.</div>';
        return;
    }

    // Group games by category for sections
    const grouped = games.reduce((acc, game) => {
        if (!acc[game.category]) acc[game.category] = [];
        acc[game.category].push(game);
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

function createGameCard(game) {
    const compIcons = game.compatibility.map(device => `
        <img src="images/icons/${device}.svg" alt="${device}" class="comp-icon" title="${device}">
    `).join('');

    return `
        <div class="game-card" onclick="playGame(${game.id})">
            <div class="game-thumb-container">
                <img src="${game.image}" alt="${game.title}" class="game-thumb" loading="lazy">
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

// Supabase Placeholder
/*
const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_KEY';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);
*/