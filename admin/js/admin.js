document.addEventListener('DOMContentLoaded', async () => {
    await checkAdmin();
    setupNavigation();
    loadDashboardStats();
});

let currentReviewId = null;

const ADMIN_EMAIL = 'johncarley14@gmail.com';

async function checkAdmin() {
    if (typeof getSession === 'undefined') {
        setTimeout(checkAdmin, 500);
        return;
    }

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
}

function setupLoginForm() {
    const form = document.getElementById('admin-login-form');
    if (!form) return;

    form.onsubmit = async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-pass').value;

        try {
            const { error } = await signIn(email, pass);
            if (error) throw error;
            location.reload();
        } catch (err) {
            alert('Error de acceso: ' + err.message);
        }
    };
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

            // Load view-specific data
            if (target === 'pending') loadPendingGames();
            if (target === 'categories') loadCategoriesAdmin();
            if (target === 'dashboard') loadDashboardStats();
        });
    });

    // Logout
    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
        location.reload();
    });

    // Modal Close
    document.querySelector('.btn-close').onclick = () => {
        document.getElementById('review-modal').classList.add('hidden');
    };

    // Review Actions
    document.getElementById('btn-approve').onclick = () => updateGameStatus('approved');
    document.getElementById('btn-reject').onclick = () => updateGameStatus('rejected');

    // Add Category
    document.getElementById('btn-add-category').onclick = async () => {
        const name = prompt('Nombre de la nueva categoría:');
        if (name) {
            const { error } = await sbClient.from('categories').insert([{ name }]);
            if (error) alert(error.message);
            else loadCategoriesAdmin();
        }
    };
}

async function loadDashboardStats() {
    const { count: totalGames } = await sbClient.from('games').select('*', { count: 'exact', head: true });
    const { count: pendingGames } = await sbClient.from('games').select('*', { count: 'exact', head: true }).eq('status', 'pending');

    // Fetch aggregated plays
    const { data: games } = await sbClient.from('games').select('play_count, error_count');
    const totalPlays = games.reduce((acc, g) => acc + (g.play_count || 0), 0);
    const totalErrors = games.reduce((acc, g) => acc + (g.error_count || 0), 0);

    document.getElementById('stat-total-games').textContent = totalGames || 0;
    document.getElementById('stat-pending-games').textContent = pendingGames || 0;
    document.getElementById('stat-total-plays').textContent = totalPlays || 0;
    document.getElementById('stat-total-errors').textContent = totalErrors || 0;
}

async function loadPendingGames() {
    const list = document.getElementById('pending-list');
    list.innerHTML = '<tr><td colspan="3" style="text-align:center;">Cargando...</td></tr>';

    const { data: games, error } = await sbClient
        .from('games')
        .select(`
            *,
            profiles ( username )
        `)
        .eq('status', 'pending');

    if (error) return;

    if (games.length === 0) {
        list.innerHTML = '<tr><td colspan="3" style="text-align:center;">No hay juegos pendientes.</td></tr>';
        return;
    }

    list.innerHTML = games.map(g => `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap: 1rem;">
                    <img src="${fixGitHubImageUrl(g.image_url)}" style="width: 40px; border-radius: 4px;">
                    <span>${g.title}</span>
                </div>
            </td>
            <td>${g.profiles?.full_name || g.profiles?.username || 'Usuario'}</td>
            <td>
                <button class="btn-small" onclick="openReviewModal('${g.id}')">Revisar</button>
            </td>
        </tr>
    `).join('');
}

window.openReviewModal = async (id) => {
    currentReviewId = id;
    const { data: game } = await sbClient.from('games').select('*, profiles(username, full_name)').eq('id', id).single();

    document.getElementById('review-title').textContent = `Revisando: ${game.title}`;
    document.getElementById('review-author').textContent = game.profiles?.full_name || game.profiles?.username || 'Usuario';
    document.getElementById('review-url').href = game.repo_url;
    document.getElementById('review-desc').textContent = game.description;
    document.getElementById('review-iframe').src = game.repo_url;
    document.getElementById('review-notes').value = game.admin_notes || '';

    document.getElementById('review-modal').classList.remove('hidden');
};

async function updateGameStatus(status) {
    const notes = document.getElementById('review-notes').value;

    const { error } = await sbClient
        .from('games')
        .update({ status, admin_notes: notes })
        .eq('id', currentReviewId);

    if (error) {
        alert(error.message);
    } else {
        document.getElementById('review-modal').classList.add('hidden');
        loadPendingGames();
        loadDashboardStats();
    }
}

async function loadCategoriesAdmin() {
    const list = document.getElementById('categories-list-admin');
    const { data: cats } = await sbClient.from('categories').select('*').order('name');

    list.innerHTML = cats.map(c => `
        <tr>
            <td>${c.id}</td>
            <td>${c.name}</td>
            <td>
                <button class="btn-icon" onclick="deleteCategory(${c.id})">🗑️</button>
            </td>
        </tr>
    `).join('');
}

window.deleteCategory = async (id) => {
    if (!confirm('¿Eliminar esta categoría?')) return;
    const { error } = await sbClient.from('categories').delete().eq('id', id);
    if (error) alert(error.message);
    else loadCategoriesAdmin();
};

/** Utility duplicate from main app to ensure display in admin */
function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}
