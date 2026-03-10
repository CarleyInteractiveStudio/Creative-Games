document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    if (!gameId) {
        window.location.href = 'index.html';
        return;
    }

    // Load Game Data
    await loadGameDetails(gameId);
    await loadComments(gameId);
    await loadSidebarGames();

    // Tracking
    trackPlayTime(gameId);

    // Event Listeners
    setupCommentForm(gameId);
    setupActionButtons(gameId);
});

async function loadGameDetails(id) {
    try {
        const { data: game, error } = await sbClient
            .from('games')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !game) throw error;

        document.title = `${game.title} - Creative Game`;
        document.getElementById('game-title').textContent = game.title;
        document.getElementById('game-category').textContent = (game.categories && game.categories.length > 0) ? game.categories[0] : 'Otros';
        document.getElementById('game-description').textContent = game.description;

        const iframe = document.getElementById('game-iframe');
        iframe.src = game.repo_url;

        // Check if favorited
        const favorites = await getFavorites();
        if (favorites.includes(id)) {
            document.getElementById('btn-like').classList.add('active');
        }
    } catch (err) {
        console.error('Error loading game:', err);
        // window.location.href = 'index.html';
    }
}

async function loadComments(gameId) {
    const container = document.getElementById('comments-list');
    container.innerHTML = '<p class="empty-msg">Cargando comentarios...</p>';

    try {
        const { data: comments, error } = await sbClient
            .from('comments')
            .select(`
                *,
                profiles ( username )
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById('comments-count').textContent = comments.length;

        if (comments.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay comentarios aún. ¡Sé el primero!</p>';
            return;
        }

        container.innerHTML = comments.map(c => `
            <div class="comment-item">
                <div class="comment-avatar">${(c.profiles?.username || 'U')[0].toUpperCase()}</div>
                <div class="comment-content">
                    <div class="comment-user-info">
                        <span class="comment-username">${c.profiles?.username || 'Usuario'}</span>
                        <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
                    </div>
                    <p class="comment-text">${escapeHTML(c.content)}</p>
                </div>
            </div>
        `).join('');

    } catch (err) {
        console.error('Error loading comments:', err);
    }
}

function setupCommentForm(gameId) {
    const form = document.getElementById('comment-form');
    const textarea = document.getElementById('comment-text');
    const charCount = document.getElementById('char-count');

    textarea.addEventListener('input', () => {
        const remaining = textarea.value.length;
        charCount.textContent = `${remaining}/300`;
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Debes iniciar sesión para comentar.');
            window.location.href = 'cuenta.html';
            return;
        }

        const content = textarea.value.trim();
        if (!content) return;

        try {
            const { error } = await sbClient
                .from('comments')
                .insert([{
                    game_id: gameId,
                    user_id: user.id,
                    content: content
                }]);

            if (error) throw error;

            textarea.value = '';
            charCount.textContent = '0/300';
            loadComments(gameId);
        } catch (err) {
            alert(err.message);
        }
    });
}

function setupActionButtons(gameId) {
    const btnLike = document.getElementById('btn-like');
    const btnReport = document.getElementById('btn-report');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    btnLike.addEventListener('click', async () => {
        try {
            await toggleFavorite(gameId);
            btnLike.classList.toggle('active');
        } catch (err) {
            alert(err.message);
        }
    });

    btnReport.addEventListener('click', async () => {
        if (!confirm('¿Estás seguro de que quieres reportar un error en este juego?')) return;

        try {
            const { error } = await supabase.rpc('report_game_error', { game_id_param: gameId });
            if (error) throw error;
            alert('Reporte enviado. Gracias por tu ayuda.');
        } catch (err) {
            alert(err.message);
        }
    });

    btnFullscreen.addEventListener('click', () => {
        const iframe = document.getElementById('game-iframe');
        if (iframe.requestFullscreen) {
            iframe.requestFullscreen();
        } else if (iframe.webkitRequestFullscreen) {
            iframe.webkitRequestFullscreen();
        } else if (iframe.msRequestFullscreen) {
            iframe.msRequestFullscreen();
        }
    });
}

async function loadSidebarGames() {
    const container = document.getElementById('sidebar-games-list');

    try {
        const { data: games, error } = await supabase
            .from('games')
            .select('*')
            .eq('status', 'approved')
            .limit(6);

        if (error) throw error;

        container.innerHTML = games.map(g => `
            <a href="juego.html?id=${g.id}" class="sidebar-game-card">
                <img src="${g.image_url}" alt="${g.title}" class="sidebar-thumb">
                <div class="sidebar-info">
                    <div class="sidebar-name">${g.title}</div>
                    <div class="sidebar-category">${(g.categories && g.categories.length > 0) ? g.categories[0] : 'Otros'}</div>
                </div>
            </a>
        `).join('');
    } catch (err) {
        console.error('Error loading sidebar games:', err);
    }
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

let sessionStartTime = null;
let currentPlaySessionId = null;

async function trackPlayTime(gameId) {
    sessionStartTime = Date.now();
    try {
        currentPlaySessionId = await startPlaySession(gameId, 'web');
    } catch (e) {
        console.warn('Analytics disabled (not logged in or server error)');
    }

    window.addEventListener('beforeunload', async () => {
        if (currentPlaySessionId && sessionStartTime) {
            const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
            // Using navigator.sendBeacon would be better for reliability on close
            // but update endPlaySession to use standard fetch if possible.
            // For now, we'll try a standard call.
            await endPlaySession(currentPlaySessionId, duration);
        }
    });
}
