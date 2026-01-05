document.addEventListener('DOMContentLoaded', () => {
    const gamepadStatusElement = document.getElementById('gamepad-config-status');

    function updateGamepadStatus() {
        const gamepads = navigator.getGamepads();
        const connectedGamepad = Array.from(gamepads).find(g => g);

        if (connectedGamepad) {
            // Display the ID of the first connected gamepad
            gamepadStatusElement.textContent = `${connectedGamepad.id}`;
            gamepadStatusElement.style.fontStyle = 'normal';
            gamepadStatusElement.style.color = '#FFC107'; // Accent color for connected status
        } else {
            gamepadStatusElement.textContent = 'Desconectado';
            gamepadStatusElement.style.fontStyle = 'italic';
            gamepadStatusElement.style.color = '#a0a0a0';
        }
    }

    // Check status on load
    updateGamepadStatus();

    // Listen for gamepad connection and disconnection events
    window.addEventListener('gamepadconnected', updateGamepadStatus);
    window.addEventListener('gamepaddisconnected', updateGamepadStatus);
});
