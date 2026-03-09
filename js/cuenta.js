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

// Initialize App State
document.addEventListener('DOMContentLoaded', () => {
    checkAuthState();
    setupAuthListeners();
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

    // Update User Profile UI
    userDisplayName.textContent = `Bienvenido, ${currentUser.name || 'Usuario'}`;
    userEmailDisplay.textContent = currentUser.email;
    userInitials.textContent = (currentUser.name || 'U').charAt(0).toUpperCase();

    loadUserGames();
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