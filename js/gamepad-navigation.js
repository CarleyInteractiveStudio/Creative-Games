
document.addEventListener('DOMContentLoaded', () => {
    const gameCards = document.querySelectorAll('.game-card');
    let selectedCardIndex = 0;
    let gamepadConnected = false;
    let animationFrameId;

    function updateSelection() {
        gameCards.forEach((card, index) => {
            if (index === selectedCardIndex) {
                card.classList.add('selected');
                card.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                card.classList.remove('selected');
            }
        });
    }

    function handleGamepadInput() {
        if (!gamepadConnected) return;

        const gamepads = navigator.getGamepads();
        if (!gamepads[0]) return;

        const gamepad = gamepads[0];
        const rows = Math.ceil(gameCards.length / 4); // Assuming a 4-column grid

        // D-pad navigation
        if (gamepad.buttons[12].pressed) { // D-pad Up
            selectedCardIndex = (selectedCardIndex - 4 + gameCards.length) % gameCards.length;
            updateSelection();
        }
        if (gamepad.buttons[13].pressed) { // D-pad Down
            selectedCardIndex = (selectedCardIndex + 4) % gameCards.length;
            updateSelection();
        }
        if (gamepad.buttons[14].pressed) { // D-pad Left
            selectedCardIndex = (selectedCardIndex - 1 + gameCards.length) % gameCards.length;
            updateSelection();
        }
        if (gamepad.buttons[15].pressed) { // D-pad Right
            selectedCardIndex = (selectedCardIndex + 1) % gameCards.length;
            updateSelection();
        }

        // A button to click
        if (gamepad.buttons[0].pressed) {
            gameCards[selectedCardIndex].querySelector('a').click();
        }

        animationFrameId = requestAnimationFrame(handleGamepadInput);
    }

    window.addEventListener('gamepadconnected', () => {
        gamepadConnected = true;
        if (gameCards.length > 0) {
            updateSelection();
            animationFrameId = requestAnimationFrame(handleGamepadInput);
        }
    });

    window.addEventListener('gamepaddisconnected', () => {
        gamepadConnected = false;
        cancelAnimationFrame(animationFrameId);
        gameCards.forEach(card => card.classList.remove('selected'));
    });

    // Initial check
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(gamepads).some(g => g)) {
        gamepadConnected = true;
        if (gameCards.length > 0) {
            updateSelection();
            animationFrameId = requestAnimationFrame(handleGamepadInput);
        }
    }
});
