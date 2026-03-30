document.addEventListener('DOMContentLoaded', async () => {
    await checkAdmin();
    setupNavigation();
});

let currentReviewId = null;
const ADMIN_EMAIL = 'johncarley14@gmail.com';

async function checkAdmin() {
    const session = await getSession();
    const layout = document.getElementById('main-layout');
    const authView = document.getElementById('view-auth');

    if (!session) {
        layout.classList.add('hidden');
        authView.classList.remove('hidden');
        setupLoginForm();
        return;
    }

    if (session.user.email !== ADMIN_EMAIL) {
        layout.classList.add('hidden');
        authView.classList.remove('hidden');
        document.getElementById('auth-content').innerHTML = `
            <div class="denied-icon">🚫</div>
            <h1 class="view-title">Acceso Denegado</h1>
            <p style="color: var(--text-gray); max-width: 400px; margin: 0 auto 2rem;">
                Tu cuenta (${session.user.email}) no tiene permisos para acceder aquí.
            </p>
            <button class="btn-small" onclick="signOut().then(() => location.reload())">Cerrar Sesión</button>
        `;
        return;
    }

    layout.classList.remove('hidden');
    authView.classList.add('hidden');
    document.getElementById('admin-email').textContent = session.user.email;
    loadDashboardStats();
}

/**
 * Called by handleSSOCallback in admin/js/supabase.js
 */
window.checkAdminSession = checkAdmin;

function setupLoginForm() {
    const btn = document.createElement('button');
    btn.className = 'btn-primary';
    btn.textContent = 'Iniciar Sesión';
    btn.onclick = () => {
        window.location.href = `https://carleystudio.com/sso.html?redirect_to=https://creativegame.online`;
    };

    const container = document.getElementById('admin-login-form');
    if (container) {
        container.innerHTML = '';
        container.appendChild(btn);
    }
}

function setupNavigation() {
    const links = document.querySelectorAll('.nav-link');
    const views = document.querySelectorAll('.view');

    links.forEach(link => {
        link.addEventListener('click', () => {
            const target = link.dataset.view;

            links.forEach(l => l.classList.remove('active'));
            link.classList.add('active');

            views.forEach(v => {
                if (v.id === `view-${target}`) v.classList.remove('hidden');
                else v.classList.add('hidden');
            });

            if (target === 'pending') loadPendingGames();
            if (target === 'categories') loadCategoriesAdmin();
            if (target === 'dashboard') loadDashboardStats();
        });
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
    });

    const closeBtn = document.querySelector('.btn-close');
    if (closeBtn) {
        closeBtn.onclick = () => {
            document.getElementById('review-modal').classList.add('hidden');
        };
    }

    document.getElementById('btn-approve').onclick = () => updateGameStatus('approved');
    document.getElementById('btn-reject').onclick = () => updateGameStatus('rejected');

    document.getElementById('btn-add-category').onclick = async () => {
        const name = prompt('Nombre de la nueva categoría:');
        if (name) {
            try {
                await sbClient.from('categories').insert([{ name }]);
                loadCategoriesAdmin();
            } catch (e) {
                alert('Error al añadir categoría');
            }
        }
    };
}

async function loadDashboardStats() {
    try {
        const { data: games } = await sbClient.from('games').select('status, play_count, error_count');
        if (!games) return;

        const totalGames = games.length;
        const pendingGames = games.filter(g => g.status === 'pending').length;
        const totalPlays = games.reduce((acc, g) => acc + (g.play_count || 0), 0);
        const totalErrors = games.reduce((acc, g) => acc + (g.error_count || 0), 0);

        document.getElementById('stat-total-games').textContent = totalGames;
        document.getElementById('stat-pending-games').textContent = pendingGames;
        document.getElementById('stat-total-plays').textContent = totalPlays;
        document.getElementById('stat-total-errors').textContent = totalErrors;
    } catch (e) {
        console.error('Error stats:', e);
    }
}

async function loadPendingGames() {
    const list = document.getElementById('pending-list');
    list.innerHTML = '<tr><td colspan="3" style="text-align:center;">Cargando...</td></tr>';

    try {
        const { data: games } = await sbClient.from('games').select('*, profiles(username, full_name)').eq('status', 'pending');

        if (!games || games.length === 0) {
            list.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay juegos pendientes.</td></tr>';
            return;
        }

        list.innerHTML = games.map(g => `
            <tr>
                <td>
                    <div style="display:flex; align-items:center; gap: 1rem;">
                        <img src="${fixGitHubImageUrl(g.image_url)}" style="width: 40px; border-radius: 4px;">
                        <span>${escapeHTML(g.title)}</span>
                    </div>
                </td>
                <td>${escapeHTML(g.profiles?.full_name || g.profiles?.username || 'Usuario')}</td>
                <td>
                    <button class="btn-small" onclick="openReviewModal('${g.id}')">Revisar</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center; color: red;">Error al cargar.</td></tr>';
    }
}

window.openReviewModal = async (id) => {
    currentReviewId = id;
    try {
        const { data: game } = await sbClient.from('games').select('*, profiles(username, full_name)').eq('id', id).single();
        if (!game) throw new Error('Game not found');

        document.getElementById('review-title').textContent = `Revisando: ${game.title}`;
        document.getElementById('review-author').textContent = game.profiles?.full_name || game.profiles?.username || 'Usuario';
        document.getElementById('review-url').href = game.repo_url;
        document.getElementById('review-desc').textContent = game.description;
        document.getElementById('review-iframe').src = game.repo_url;
        document.getElementById('review-notes').value = game.admin_notes || '';

        document.getElementById('review-modal').classList.remove('hidden');
    } catch (e) {
        alert('Error al cargar detalle del juego.');
    }
};

async function updateGameStatus(status) {
    const notes = document.getElementById('review-notes').value;

    try {
        await sbClient.from('games').update({ status, admin_notes: notes }).eq('id', currentReviewId);
        document.getElementById('review-modal').classList.add('hidden');
        loadPendingGames();
        loadDashboardStats();
    } catch (e) {
        alert('Error al actualizar estado.');
    }
}

async function loadCategoriesAdmin() {
    const list = document.getElementById('categories-list-admin');
    try {
        const { data: cats } = await sbClient.from('categories').select('*').order('name');
        if (!cats) return;

        list.innerHTML = cats.map(c => `
            <tr>
                <td>${c.id}</td>
                <td>${escapeHTML(c.name)}</td>
                <td>
                    <button class="btn-icon" onclick="deleteCategory(${c.id})">🗑️</button>
                </td>
            </tr>
        `).join('');
    } catch (e) {
        list.innerHTML = '<tr><td colspan="3">Error.</td></tr>';
    }
}

window.deleteCategory = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    try {
        await sbClient.from('categories').delete().eq('id', id);
        loadCategoriesAdmin();
    } catch (e) {
        alert('Error al eliminar.');
    }
};

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}
