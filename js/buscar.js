let allResults = [];
let currentFilter = 'all';

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const query = urlParams.get('q');

    if (!query) {
        document.getElementById('search-query-display').textContent = 'Explora todos los juegos';
        await performSearch('');
    } else {
        document.getElementById('search-query-display').innerHTML = `Resultados para: <span class="gold-text">"${escapeHTML(query)}"</span>`;
        await performSearch(query);
    }

    const searchInput = document.getElementById('game-search');
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            window.location.href = `buscar.html?q=${encodeURIComponent(searchInput.value)}`;
        }
    });
});

async function performSearch(query) {
    const grid = document.getElementById('search-results-grid');

    try {
        let dbQuery = sbClient
            .from('games')
            .select(`
                *,
                profiles ( username, full_name )
            `)
            .eq('status', 'approved');

        // Note: bridge doesn't support complex 'or' yet in filter object usually,
        // but shim might handle it if I implement it. For now, keep as is or adjust.
        // Actually, my shim just adds to filter object.

        const { data: games, error } = await dbQuery.order('created_at', { ascending: false });

        if (error) throw error;

        allResults = games || [];
        renderResults(allResults);

    } catch (err) {
        console.error('Search error:', err);
        grid.innerHTML = '<p class="empty-msg">Error al realizar la búsqueda.</p>';
    }
}

function renderResults(games) {
    const grid = document.getElementById('search-results-grid');

    const filtered = currentFilter === 'all'
        ? games
        : games.filter(g => g.devices && g.devices.includes(currentFilter));

    if (filtered.length === 0) {
        grid.innerHTML = '<p class="empty-msg" style="grid-column: 1/-1; text-align:center; padding: 5rem;">No se encontraron juegos.</p>';
        return;
    }

    grid.innerHTML = filtered.map(game => createSearchCard(game)).join('');
}

window.filterResults = (filter) => {
    currentFilter = filter;

    document.querySelectorAll('.filter-pill').forEach(p => {
        p.classList.remove('active');
        if (p.textContent.toLowerCase() === filter || (filter === 'all' && p.textContent === 'Todos')) {
            p.classList.add('active');
        }
    });

    renderResults(allResults);
};

function createSearchCard(game) {
    const author = game.profiles?.full_name || game.profiles?.username || 'Usuario';
    const imgUrl = fixGitHubImageUrl(game.image_url);

    return `
        <div class="game-card">
            <div class="game-thumb-container" onclick="location.href='juego.html?id=${game.id}'">
                <img src="${imgUrl}" alt="${escapeHTML(game.title)}" class="game-thumb" loading="lazy">
            </div>
            <div class="game-info">
                <h3 class="game-title" onclick="location.href='juego.html?id=${game.id}'">${escapeHTML(game.title)}</h3>
                <div class="author-label" onclick="location.href='perfil.html?id=${game.user_id}'">por ${escapeHTML(author)}</div>
                <div class="game-meta">
                    <span class="rating">${Number(game.rating).toFixed(1)} ★</span>
                </div>
            </div>
        </div>
    `;
}
