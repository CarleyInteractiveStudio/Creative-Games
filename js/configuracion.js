document.addEventListener('DOMContentLoaded', () => {
    // --- Navigation ---
    const navItems = document.querySelectorAll('.settings-nav .nav-item');
    const sections = document.querySelectorAll('.settings-content .settings-section');

    function showSection(targetId) {
        sections.forEach(section => {
            section.classList.toggle('active', section.id === targetId);
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (event) => {
            event.preventDefault();
            navItems.forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('href').substring(1);
            showSection(targetId);
            history.pushState(null, null, `#${targetId}`);
        });
    });

    const currentHash = window.location.hash;
    if (currentHash) {
        const targetId = currentHash.substring(1);
        const targetNavItem = document.querySelector(`.nav-item[href="#${targetId}"]`);
        if (targetNavItem) {
            navItems.forEach(nav => nav.classList.remove('active'));
            targetNavItem.classList.add('active');
            showSection(targetId);
        }
    } else if (sections.length > 0) {
        sections[0].classList.add('active');
        navItems[0].classList.add('active');
    }

    // --- User Data Loading ---
    const profileUsername = document.getElementById('profile-username');
    const profileEmail = document.getElementById('profile-email');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const dobInput = document.getElementById('dob');
    const profilePicPreview = document.querySelector('.profile-pic-preview');
    const profileCardPic = document.querySelector('.profile-card .profile-pic');

    function loadUserData() {
        const username = localStorage.getItem('username') || 'NombreUsuario';
        const email = localStorage.getItem('email') || 'usuario@email.com';
        const dob = localStorage.getItem('dob') || '';
        const profilePic = localStorage.getItem('profilePic');

        profileUsername.textContent = username;
        profileEmail.textContent = email;
        usernameInput.value = username;
        emailInput.value = email;
        dobInput.value = dob;

        if (profilePic) {
            profilePicPreview.src = profilePic;
            profileCardPic.src = profilePic;
        }
    }

    // --- Profile Picture Upload ---
    const profilePicUpload = document.getElementById('profile-pic-upload');
    profilePicUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const imageUrl = e.target.result;
                profilePicPreview.src = imageUrl;
                profileCardPic.src = imageUrl;
                localStorage.setItem('profilePic', imageUrl);
                showNotification('Foto de perfil actualizada.');
            };
            reader.readAsDataURL(file);
        }
    });

    // --- Form Submission ---
    const gestionForm = document.querySelector('#gestion-section .form-grid');
    gestionForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const newUsername = usernameInput.value;
        const newDob = dobInput.value;

        localStorage.setItem('username', newUsername);
        localStorage.setItem('dob', newDob);

        // Update profile card display
        profileUsername.textContent = newUsername;

        showNotification('Datos de la cuenta actualizados.');

        // Note: Password is not saved for security simulation
        const passwordInput = document.getElementById('password');
        if (passwordInput.value) {
            passwordInput.value = ''; // Clear after "saving"
        }
    });

    // --- Developer Status ---
    const becomeDeveloperBtn = document.getElementById('become-developer-btn');
    const developerCta = document.getElementById('developer-cta');
    const developerInfo = document.getElementById('developer-info');

    function checkDeveloperStatus() {
        if (localStorage.getItem('isDeveloper') === 'true') {
            developerCta.classList.add('hidden');
            developerInfo.classList.remove('hidden');
        } else {
            developerCta.classList.remove('hidden');
            developerInfo.classList.add('hidden');
        }
    }

    becomeDeveloperBtn.addEventListener('click', () => {
        localStorage.setItem('isDeveloper', 'true');
        checkDeveloperStatus();
        showNotification('¡Felicidades! Te has convertido en desarrollador.');
    });

    // --- Danger Zone ---
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    deleteAccountBtn.addEventListener('click', () => {
        if (confirm('¿Estás seguro de que quieres borrar tu cuenta? Esta acción es irreversible.')) {
            // Clear all user-related data
            localStorage.removeItem('username');
            localStorage.removeItem('email');
            localStorage.removeItem('dob');
            localStorage.removeItem('profilePic');
            localStorage.removeItem('isDeveloper');
            localStorage.removeItem('favoriteGames');
            localStorage.removeItem('playedHistory');
            localStorage.removeItem('gamepadConfig');

            showNotification('Cuenta eliminada con éxito. Serás redirigido.');

            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    });

    // --- Gamepad ---
    const reconfigureGamepadBtn = document.getElementById('reconfigure-gamepad-btn');
    const gamepadStatus = document.getElementById('gamepad-config-status');

    function updateGamepadStatus() {
        if(localStorage.getItem('gamepadConfig')) {
            const config = JSON.parse(localStorage.getItem('gamepadConfig'));
            gamepadStatus.textContent = `Configurado (${config.family})`;
            reconfigureGamepadBtn.textContent = 'Reconfigurar Mando';
        } else {
            gamepadStatus.textContent = 'No configurado';
            reconfigureGamepadBtn.textContent = 'Configurar Mando';
        }
    }

    if (reconfigureGamepadBtn) {
        reconfigureGamepadBtn.addEventListener('click', () => {
            if (confirm('¿Seguro que quieres borrar la configuración de tu mando?')) {
                localStorage.removeItem('gamepadConfig');
                showNotification('Configuración del mando eliminada.');
                updateGamepadStatus();
            }
        });
    }

    // --- Initial Load ---
    loadUserData();
    checkDeveloperStatus();
    updateGamepadStatus();
});

// A simple notification function to avoid dependency on main.js
function showNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 500);
    }, 3000);
}
