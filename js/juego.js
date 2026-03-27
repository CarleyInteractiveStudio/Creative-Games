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
            .select(`
                *,
                profiles ( username, full_name )
            `)
            .eq('id', id)
            .single();

        if (error || !game) throw error;

        document.title = `${game.title} - Creative Game`;
        document.getElementById('game-title').textContent = game.title;
        document.getElementById('game-category').textContent = (game.categories && game.categories.length > 0) ? game.categories[0] : 'Otros';

        const authorEl = document.getElementById('game-author');
        const authorName = game.profiles?.full_name || game.profiles?.username || 'Usuario';
        authorEl.textContent = `Publicado por ${authorName}`;
        authorEl.onclick = () => filterByAuthor(game.user_id, authorName);

        document.getElementById('game-description').textContent = game.description;
        document.getElementById('game-engine-display').textContent = game.engine || 'Otros';

        // Dates and Badges
        const createdDate = new Date(game.created_at);
        const updatedDate = new Date(game.last_updated || game.created_at);
        const now = new Date();
        const diffDaysCreated = Math.floor((now - createdDate) / (1000 * 60 * 60 * 24));
        const diffDaysUpdated = Math.floor((now - updatedDate) / (1000 * 60 * 60 * 24));

        if (diffDaysCreated <= 7) document.getElementById('badge-new').classList.remove('hidden');
        else if (diffDaysUpdated <= 7 && game.last_updated) document.getElementById('badge-updated').classList.remove('hidden');

        document.getElementById('game-updated-at').textContent = `Actualizado: ${updatedDate.toLocaleDateString()}`;

        // Update Meta Tags for Sharing
        document.querySelector('meta[property="og:title"]').content = game.title;
        document.querySelector('meta[property="og:description"]').content = game.description || 'Juega en Creative Game';
        document.querySelector('meta[property="og:image"]').content = fixGitHubImageUrl(game.image_url);

        // Render controls based on compatibility (showing all relevant ones)
        let controlsHtml = '';
        if (game.controls_pc && game.devices.includes('pc')) controlsHtml += `<p><strong>💻 PC:</strong> ${game.controls_pc}</p>`;
        if (game.controls_console && game.devices.includes('console')) controlsHtml += `<p><strong>🎮 Consola:</strong> ${game.controls_console}</p>`;
        if (game.controls_mobile && game.devices.includes('mobile')) controlsHtml += `<p><strong>📱 Móvil:</strong> ${game.controls_mobile}</p>`;
        if (game.controls_tv && game.devices.includes('tv')) controlsHtml += `<p><strong>📺 Smart TV:</strong> ${game.controls_tv}</p>`;

        document.getElementById('controls-content').innerHTML = controlsHtml || 'Este juego no tiene controles especificados.';

        // --- Play Sequence ---
        const iframe = document.getElementById('game-iframe');
        const playOverlay = document.getElementById('play-overlay');
        const splashScreen = document.getElementById('splash-screen');

        playOverlay.addEventListener('click', () => {
            playOverlay.classList.add('hidden');
            splashScreen.classList.remove('hidden');

            // Start Intro sequence
            setTimeout(() => {
                iframe.src = game.repo_url;
                splashScreen.classList.add('hidden');
            }, 3500);
        });

        // Load Rating
        const userRating = await getUserRating(id);
        if (userRating > 0) {
            updateStarDisplay(userRating);
        }

        // Check if favorited
        const favorites = await getFavorites();
        if (favorites.includes(id)) {
            document.getElementById('btn-like').classList.add('active');
        }
    } catch (err) {
        console.error('Error loading game:', err);
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
                profiles ( username, full_name, avatar_url )
            `)
            .eq('game_id', gameId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        document.getElementById('comments-count').textContent = comments.length;

        if (comments.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay comentarios aún. ¡Sé el primero!</p>';
            return;
        }

        container.innerHTML = comments.map(c => {
            const displayName = c.profiles?.full_name || c.profiles?.username || 'Usuario';
            const usernameLabel = c.profiles?.username ? `@${c.profiles.username}` : '';
            const avatarUrl = fixGitHubImageUrl(c.profiles?.avatar_url);

            const avatarHtml = avatarUrl
                ? `<img src="${avatarUrl}" class="comment-avatar" alt="Avatar">`
                : `<div class="comment-avatar">${displayName[0].toUpperCase()}</div>`;

            return `
                <div class="comment-item">
                    ${avatarHtml}
                    <div class="comment-content">
                        <div class="comment-user-info">
                            <span class="comment-username">${displayName} <small style="color:var(--text-gray); font-weight:normal; margin-left:5px;">${usernameLabel}</small></span>
                            <span class="comment-date">${new Date(c.created_at).toLocaleDateString()}</span>
                        </div>
                        <p class="comment-text">${escapeHTML(c.content)}</p>
                    </div>
                </div>
            `;
        }).join('');

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

        const { data: { user } } = await sbClient.auth.getUser();
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
    const btnShare = document.getElementById('btn-share');

    const shareModal = document.getElementById('share-modal');
    const closeShare = document.getElementById('close-share');
    const shareInput = document.getElementById('share-link-input');
    const btnCopy = document.getElementById('btn-copy-link');

    btnShare.addEventListener('click', () => {
        shareModal.classList.remove('hidden');
        shareInput.value = window.location.href;
    });

    closeShare.addEventListener('click', () => {
        shareModal.classList.add('hidden');
    });

    btnCopy.addEventListener('click', () => {
        shareInput.select();
        document.execCommand('copy');
        btnCopy.textContent = 'Copiado';
        setTimeout(() => btnCopy.textContent = 'Copiar', 2000);
    });

    // Social Sharing
    document.getElementById('share-whatsapp').onclick = () => {
        const text = `¡Mira este juego en Creative Game! ${window.location.href}`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
    };

    document.getElementById('share-facebook').onclick = () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`, '_blank');
    };

    document.getElementById('share-x').onclick = () => {
        const text = `¡Mira este juego en Creative Game!`;
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(window.location.href)}`, '_blank');
    };

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
            const { error } = await sbClient.rpc('report_game_error', { game_id_param: gameId });
            if (error) throw error;
            alert('Reporte enviado. Gracias por tu ayuda.');
        } catch (err) {
            alert(err.message);
        }
    });

    // Star Rating
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', async () => {
            const score = parseInt(star.dataset.score);
            try {
                await submitRating(gameId, score);
                updateStarDisplay(score);
            } catch (err) {
                alert(err.message);
            }
        });
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
        const { data: games, error } = await sbClient
            .from('games')
            .select('*')
            .eq('status', 'approved')
            .limit(12);

        if (error) throw error;

        container.innerHTML = games.map(g => `
            <a href="juego.html?id=${g.id}" class="sidebar-game-card" title="${g.title}">
                <img src="${fixGitHubImageUrl(g.image_url)}" alt="${g.title}" class="sidebar-thumb">
            </a>
        `).join('');
    } catch (err) {
        console.error('Error loading sidebar games:', err);
    }
}

function updateStarDisplay(score) {
    const stars = document.querySelectorAll('.star');
    stars.forEach(s => {
        if (parseInt(s.dataset.score) <= score) {
            s.classList.add('active');
        } else {
            s.classList.remove('active');
        }
    });
}

async function filterByAuthor(userId, username) {
    const container = document.getElementById('sidebar-games-list');
    container.innerHTML = '<div class="loading-spinner">Cargando...</div>';

    try {
        const games = await getGameAuthorGames(userId);
        document.querySelector('.sidebar-title').textContent = `Más de ${username}`;

        if (games.length === 0) {
            container.innerHTML = '<p class="empty-msg">No hay más juegos de este autor.</p>';
            return;
        }

        container.innerHTML = games.map(g => `
            <a href="juego.html?id=${g.id}" class="sidebar-game-card" title="${g.title}">
                <img src="${fixGitHubImageUrl(g.image_url)}" alt="${g.title}" class="sidebar-thumb">
            </a>
        `).join('');
    } catch (e) {
        console.error(e);
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

        // Milestone tracking (Check every minute)
        const checkInterval = setInterval(async () => {
            if (!sessionStartTime) return;
            const elapsedMinutes = Math.floor((Date.now() - sessionStartTime) / 60000);

            if (elapsedMinutes === 10) await awardAchievement(gameId, 'Explorador (10 min)');
            if (elapsedMinutes === 30) await awardAchievement(gameId, 'Dedicado (30 min)');
            if (elapsedMinutes === 60) await awardAchievement(gameId, 'Maestro (1 hora)');
            if (elapsedMinutes === 300) await awardAchievement(gameId, 'Leyenda (5 horas)');

        }, 60000);

    } catch (e) {
        console.warn('Analytics disabled (not logged in or server error)');
    }

    window.addEventListener('beforeunload', async () => {
        if (currentPlaySessionId && sessionStartTime) {
            const duration = Math.floor((Date.now() - sessionStartTime) / 1000);
            await endPlaySession(currentPlaySessionId, duration);
        }
    });
}
