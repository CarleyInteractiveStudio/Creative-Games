document.addEventListener('DOMContentLoaded', () => {
    const gamepadStatusElement = document.getElementById('gamepad-config-status');
    const reconfigureButton = document.getElementById('reconfigure-gamepad-btn');

    function updateGamepadStatus() {
        const savedConfig = localStorage.getItem('gamepadConfig');
        if (savedConfig) {
            const config = JSON.parse(savedConfig);
            gamepadStatusElement.textContent = `Configurado (${config.family})`;
            gamepadStatusElement.style.color = '#4CAF50'; // Green text for configured status
        } else {
            gamepadStatusElement.textContent = 'No configurado';
            gamepadStatusElement.style.color = '#FFA500'; // Orange text for not configured
        }
    }

    if (reconfigureButton) {
        reconfigureButton.addEventListener('click', () => {
            // Clear the existing configuration
            localStorage.removeItem('gamepadConfig');

            // Inform the user and redirect
            alert('Configuración del mando eliminada. Serás redirigido al Modo Consola para volver a configurar tu mando cuando lo conectes.');
            window.location.href = 'console.html';
        });
    }

    // Initial status check
    updateGamepadStatus();

    // Listen for storage changes from other tabs/windows if necessary
    window.addEventListener('storage', (event) => {
        if (event.key === 'gamepadConfig') {
            updateGamepadStatus();
        }
    });

    // --- Developer Status Logic ---
    const developerButton = document.getElementById('developer-button');
    const developerConfirmation = document.getElementById('developer-confirmation');

    function updateDeveloperButtonVisibility() {
        if (localStorage.getItem('isDeveloper') === 'true') {
            developerButton.classList.add('hidden');
            developerConfirmation.classList.remove('hidden');
        } else {
            developerButton.classList.remove('hidden');
            developerConfirmation.classList.add('hidden');
        }
    }

    if (developerButton && developerConfirmation) {
        developerButton.addEventListener('click', function(event) {
            event.preventDefault();
            localStorage.setItem('isDeveloper', 'true');
            updateDeveloperButtonVisibility();
        });

        // Initial check
        updateDeveloperButtonVisibility();
    }
});
