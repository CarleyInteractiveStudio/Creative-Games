document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const authorId = urlParams.get('id');

    if (!authorId) {
        window.location.href = 'index.html';
        return;
    }

    await loadAuthorProfile(authorId);
    await loadAuthorGames(authorId);
});

async function loadAuthorProfile(id) {
    try {
        const { data: profile, error } = await sbClient
            .from('profiles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        const displayName = profile.full_name || profile.username || 'Usuario';
        document.getElementById('author-name').textContent = displayName;
        document.getElementById('author-username').textContent = `@${profile.username || 'usuario'}`;
        document.title = `Perfil de ${displayName} - Creative Game`;

        const avatarBox = document.getElementById('author-avatar-box');
        if (profile.avatar_url) {
            avatarBox.innerHTML = `<img src="${fixGitHubImageUrl(profile.avatar_url)}" alt="Avatar">`;
        } else {
            document.getElementById('author-initials').textContent = displayName[0].toUpperCase();
        }

        if (profile.interests) {
            const interestsEl = document.getElementById('author-interests');
            interestsEl.textContent = `Intereses: ${profile.interests}`;
            interestsEl.classList.remove('hidden');
        }

        await loadAuthorAchievements(id);

    } catch (err) {
        console.error('Error loading profile:', err);
        document.getElementById('author-name').textContent = 'Usuario no encontrado';
    }
}

async function loadAuthorAchievements(id) {
    const hero = document.querySelector('.profile-hero');
    try {
        const { data: achievements, error } = await sbClient
            .from('achievements')
            .select(`
                *,
                achievement_definitions ( title, icon_url )
            `)
            .eq('user_id', id)
            .limit(5);

        if (error) throw error;

        if (achievements && achievements.length > 0) {
            const achHtml = `
                <div class="author-badges" style="margin-top: 1.5rem; display: flex; justify-content: center; gap: 0.8rem;">
                    ${achievements.map(ach => {
                        const icon = fixGitHubImageUrl(ach.achievement_definitions?.icon_url) || 'images/icons/trophy.svg';
                        const title = ach.achievement_definitions?.title || ach.title;
                        return `<img src="${icon}" title="${escapeHTML(title)}" style="width: 32px; height: 32px; filter: drop-shadow(0 0 5px var(--gold));" onerror="this.src='images/icons/trophy.svg'">`;
                    }).join('')}
                </div>
            `;
            hero.insertAdjacentHTML('beforeend', achHtml);
        }
    } catch (e) {
        console.error('Error loading author achievements:', e);
    }
}

async function loadAuthorGames(id) {
    const grid = document.getElementById('author-games-grid');
    try {
        const { data: games, error } = await sbClient
            .from('games')
            .select('*')
            .eq('user_id', id)
            .eq('status', 'approved')
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (games.length === 0) {
            grid.innerHTML = '<p class="empty-msg">Este autor aún no tiene juegos publicados.</p>';
            return;
        }

        grid.innerHTML = games.map(game => createSmallGameCard(game)).join('');

    } catch (err) {
        console.error('Error loading games:', err);
        grid.innerHTML = '<p class="empty-msg">Error al cargar los juegos.</p>';
    }
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function createSmallGameCard(game) {
    const imgUrl = fixGitHubImageUrl(game.image_url) || 'https://via.placeholder.com/400x225?text=No+Image';
    return `
        <div class="game-card" onclick="location.href='juego.html?id=${game.id}'" style="min-width: 200px;">
            <div class="game-thumb-container">
                <img src="${imgUrl}" alt="${escapeHTML(game.title)}" class="game-thumb" loading="lazy">
            </div>
            <div class="game-info">
                <h3 class="game-title" style="font-size: 1rem;">${escapeHTML(game.title)}</h3>
                <div class="game-meta">
                    <span class="rating">${Number(game.rating).toFixed(1)} ★</span>
                </div>
            </div>
        </div>
    `;
}
