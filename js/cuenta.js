// Account State Management
let currentUser = null; // Set this when Supabase is integrated

// DOM Elements - Forms & Views
const authView = document.getElementById('auth-view');
const dashboardView = document.getElementById('dashboard-view');

const loginContainer = document.getElementById('login-form-container');
const registerContainer = document.getElementById('register-form-container');
const recoveryContainer = document.getElementById('recovery-form-container');

// Navigation Links
const showRegisterBtn = document.getElementById('show-register');
const showLoginBtn = document.getElementById('show-login');
const showRecoveryBtn = document.getElementById('show-recovery');
const backToLoginBtn = document.getElementById('back-to-login');

// Account Info Elements
const userDisplayName = document.getElementById('user-display-name');
const userEmailDisplay = document.getElementById('user-email-display');
const userInitials = document.getElementById('user-initials');

// Profile Settings Elements
const birthDateInput = document.getElementById('birth-date');
const calculatedAgeInput = document.getElementById('calculated-age');
const profileDetailsForm = document.getElementById('profile-details-form');
const favoritesListContainer = document.getElementById('favorites-list');

// Initialize App State
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupAuthListeners();
    setupProfileListeners();
});

async function checkAuthState() {
    const session = await getSession();
    if (session) {
        currentUser = {
            id: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.full_name || session.user.email.split('@')[0]
        };
        showDashboard();
    } else {
        showAuth();
    }
}

async function showDashboard() {
    authView.style.display = 'none';
    dashboardView.style.display = 'block';

    const session = await getSession();
    const metadata = session.user.user_metadata;

    // Update User Profile UI
    userDisplayName.textContent = `Bienvenido, ${metadata.full_name || 'Usuario'}`;
    userEmailDisplay.textContent = currentUser.email;
    userInitials.textContent = (metadata.full_name || 'U').charAt(0).toUpperCase();

    // Load Profile Settings
    if (metadata.birth_date) {
        birthDateInput.value = metadata.birth_date;
        updateAge(metadata.birth_date);
    }

    loadUserGames();
    loadFavorites();
}

function updateAge(birthDate) {
    if (!birthDate) return;
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    calculatedAgeInput.value = age + ' años';
}

async function loadFavorites() {
    // This would typically come from a 'favorites' table in Supabase
    // For now, we'll check localStorage or a profile metadata field
    const session = await getSession();
    const favorites = session.user.user_metadata.favorites || [];

    if (favorites.length === 0) {
        favoritesListContainer.innerHTML = '<p class="empty-msg">No tienes juegos favoritos aún.</p>';
        return;
    }

    // Fetch game details for these IDs
    const { data: games, error } = await window.sbClient
        .from('games')
        .select('*')
        .in('id', favorites);

    if (error || !games || games.length === 0) {
        favoritesListContainer.innerHTML = '<p class="empty-msg">No se pudieron cargar tus favoritos.</p>';
        return;
    }

    favoritesListContainer.innerHTML = games.map(game => `
        <div class="game-card-mini" onclick="location.href='juego.html?id=${game.id}'">
            <img src="${game.image}" alt="${game.title}">
            <div class="mini-info">
                <span>${game.title}</span>
            </div>
        </div>
    `).join('');
}

async function loadUserGames() {
    const gamesList = document.getElementById('user-games-list');
    const games = await getUserGames(currentUser.id);

    if (!games || games.length === 0) {
        gamesList.innerHTML = `
            <tr class="empty-row">
                <td colspan="4" style="text-align: center; color: var(--text-gray); padding: 2rem;">
                    No has publicado ningún juego todavía.
                </td>
            </tr>
        `;
        return;
    }

    gamesList.innerHTML = games.map(game => `
        <tr>
            <td>
                <div class="game-row-info">
                    <img src="${game.image}" class="game-mini-thumb">
                    <span>${game.title}</span>
                </div>
            </td>
            <td>${game.category}</td>
            <td><span class="status-badge">Publicado</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-icon" title="Editar">✏️</button>
                    <button class="btn-icon delete" title="Eliminar" onclick="deleteGame(${game.id})">🗑️</button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function deleteGame(id) {
    if (!confirm('¿Estás seguro de que quieres eliminar este juego?')) return;

    const { error } = await window.sbClient
        .from('games')
        .delete()
        .eq('id', id);

    if (error) alert(error.message);
    else loadUserGames();
}

function showAuth() {
    authView.style.display = 'block';
    dashboardView.style.display = 'none';
}

function setupProfileListeners() {
    birthDateInput?.addEventListener('change', (e) => {
        updateAge(e.target.value);
    });

    profileDetailsForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const bDate = birthDateInput.value;
        if (!bDate) return;

        const { error } = await window.sbClient.auth.updateUser({
            data: { birth_date: bDate }
        });

        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Perfil actualizado');
        }
    });
}

function setupAuthListeners() {
    // Switch between forms
    showRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        registerContainer.classList.remove('hidden');
    });

    showLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        registerContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    showRecoveryBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        loginContainer.classList.add('hidden');
        recoveryContainer.classList.remove('hidden');
    });

    backToLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        recoveryContainer.classList.add('hidden');
        loginContainer.classList.remove('hidden');
    });

    // Real Supabase Auth Handlers
    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('login-email').value;
        const pass = document.getElementById('login-password').value;

        const { data, error } = await signIn(email, pass);
        if (error) {
            alert('Error: ' + error.message);
        } else {
            checkAuthState();
        }
    });

    document.getElementById('logout-btn').addEventListener('click', async () => {
        await signOut();
        currentUser = null;
        showAuth();
    });

    document.getElementById('register-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const pass = document.getElementById('reg-password').value;

        const { data, error } = await signUp(email, pass, { full_name: name });
        if (error) {
            alert('Error: ' + error.message);
        } else {
            alert('Registro exitoso. Por favor revisa tu correo para confirmar la cuenta.');
            showLoginBtn.click();
        }
    });

    document.getElementById('recovery-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('recovery-email').value;
        const { error } = await _supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.href
        });
        if (error) alert(error.message);
        else alert('Se ha enviado un correo de recuperación.');
    });
}