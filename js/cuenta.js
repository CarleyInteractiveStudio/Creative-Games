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
    initGamepadSupport();
});

// Gamepad Support for Account Page
let accountMode = 'auth'; // 'auth', 'dashboard'
let focusIndex = 0;
let lastButtons = {};
let focusables = [];

function initGamepadSupport() {
    window.addEventListener("gamepadconnected", () => {
        console.log("Gamepad connected to account page");
        gamepadLoop();
    });

    // Proactive check
    const gps = navigator.getGamepads();
    if (gps[0]) gamepadLoop();
}

function gamepadLoop() {
    const gps = navigator.getGamepads();
    if (!gps[0]) return;
    const gp = gps[0];

    const pressed = (btnIndex) => {
        const isPressed = gp.buttons[btnIndex] && gp.buttons[btnIndex].pressed;
        const wasPressed = lastButtons[btnIndex];
        lastButtons[btnIndex] = isPressed;
        return isPressed && !wasPressed;
    };

    const stickMoved = (axis, dir) => {
        const val = gp.axes[axis];
        const key = `axis_${axis}_${dir}`;
        const threshold = 0.5;
        const isMoved = dir > 0 ? val > threshold : val < -threshold;
        const wasMoved = lastButtons[key];
        lastButtons[key] = isMoved;
        return isMoved && !wasMoved;
    };

    const UP = pressed(12) || stickMoved(1, -1);
    const DOWN = pressed(13) || stickMoved(1, 1);
    const LEFT = pressed(14) || stickMoved(0, -1);
    const RIGHT = pressed(15) || stickMoved(0, 1);
    const A = pressed(0);
    const B = pressed(1);

    updateFocusables();

    if (UP) focusIndex = Math.max(0, focusIndex - 1);
    if (DOWN) focusIndex = Math.min(focusables.length - 1, focusIndex + 1);
    if (A && focusables[focusIndex]) {
        focusables[focusIndex].focus();
        focusables[focusIndex].click();
    }
    if (B) window.location.href = 'index.html';

    applyFocus();
    requestAnimationFrame(gamepadLoop);
}

function updateFocusables() {
    const activeSection = authView.style.display !== 'none' ? authView : dashboardView;
    // Find all interactive elements that are visible
    focusables = Array.from(activeSection.querySelectorAll('input, button, a, [onclick]'))
        .filter(el => {
            const style = window.getComputedStyle(el);
            return style.display !== 'none' && style.visibility !== 'hidden' && !el.closest('.hidden');
        });
}

function applyFocus() {
    focusables.forEach((el, i) => {
        if (i === focusIndex) {
            el.classList.add('gamepad-focused');
        } else {
            el.classList.remove('gamepad-focused');
        }
    });
}

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

    // Gender & Avatar Display
    const genderDisplay = document.getElementById('user-gender-display');
    if (genderDisplay) genderDisplay.textContent = `Sexo: ${metadata.gender || 'No especificado'}`;

    const avatarImg = document.getElementById('user-avatar-img');
    const initials = document.getElementById('user-initials');

    if (metadata.avatar_url) {
        avatarImg.src = metadata.avatar_url;
        avatarImg.classList.remove('hidden');
        initials.classList.add('hidden');
    } else {
        avatarImg.classList.add('hidden');
        initials.classList.remove('hidden');
        initials.textContent = (metadata.full_name || 'U').charAt(0).toUpperCase();
    }

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
            <img src="${game.image_url}" alt="${game.title}">
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
                    <img src="${game.image_url}" class="game-mini-thumb">
                    <span>${game.title}</span>
                </div>
            </td>
            <td>${(game.categories && game.categories.length > 0) ? game.categories[0] : 'Otros'}</td>
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
    // Tab switching
    const btnLoginTab = document.getElementById('btn-login-tab');
    const btnRegisterTab = document.getElementById('btn-register-tab');
    const btnManageTab = document.getElementById('btn-manage-tab');

    function setActiveTab(btn) {
        [btnLoginTab, btnRegisterTab, btnManageTab].forEach(b => b?.classList.remove('active'));
        btn?.classList.add('active');
    }

    btnLoginTab?.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(btnLoginTab);
        loginContainer.classList.remove('hidden');
        registerContainer.classList.add('hidden');
        recoveryContainer.classList.add('hidden');
    });

    btnRegisterTab?.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://carleystudio.com/cuenta.html', '_blank');
    });

    btnManageTab?.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(btnManageTab);
        window.open('https://carleystudio.com/cuenta.html', '_blank');
    });

    // Switch between forms
    showRegisterBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        window.open('https://carleystudio.com/cuenta.html', '_blank');
    });

    showLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(btnLoginTab);
        if (loginContainer) loginContainer.classList.remove('hidden');
        if (recoveryContainer) recoveryContainer.classList.add('hidden');
    });

    showRecoveryBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        if (loginContainer) loginContainer.classList.add('hidden');
        if (recoveryContainer) recoveryContainer.classList.remove('hidden');
    });

    backToLoginBtn?.addEventListener('click', (e) => {
        e.preventDefault();
        setActiveTab(btnLoginTab);
        if (recoveryContainer) recoveryContainer.classList.add('hidden');
        if (loginContainer) loginContainer.classList.remove('hidden');
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