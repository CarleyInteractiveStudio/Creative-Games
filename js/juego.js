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

    // Event Listeners
    setupCommentForm(gameId);
    setupActionButtons(gameId);
});

async function loadGameDetails(id) {
    try {
        const { data: game, error } = await supabase
            .from('games')
            .select('*')
            .eq('id', id)
            .single();

        if (error || !game) throw error;

        document.title = `${game.title} - Creative Game`;
        document.getElementById('game-title').textContent = game.title;
        document.getElementById('game-category').textContent = game.category;
        document.getElementById('game-description').textContent = game.description;

        const iframe = document.getElementById('game-iframe');
        iframe.src = game.repo_url;

        // Check if liked
        const user = (await supabase.auth.getUser()).data.user;
        if (user) {
            const { data: like } = await supabase
                .from('likes')
                .select('*')
                .eq('game_id', id)
                .eq('user_id', user.id)
                .single();

            if (like) {
                document.getElementById('btn-like').classList.add('active');
            }
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
        const { data: comments, error } = await supabase
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
            const { error } = await supabase
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
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('Inicia sesión para dar me gusta.');
            return;
        }

        const isActive = btnLike.classList.contains('active');

        if (isActive) {
            await supabase.from('likes').delete().eq('game_id', gameId).eq('user_id', user.id);
            btnLike.classList.remove('active');
        } else {
            await supabase.from('likes').insert([{ game_id: gameId, user_id: user.id }]);
            btnLike.classList.add('active');
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
                <img src="${g.thumbnail_url}" alt="${g.title}" class="sidebar-thumb">
                <div class="sidebar-info">
                    <div class="sidebar-name">${g.title}</div>
                    <div class="sidebar-category">${g.category}</div>
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
