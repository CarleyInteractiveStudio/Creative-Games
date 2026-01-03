function initGamepadNavigation() {
    // --- STATE & SETUP ---
    const isConsoleMode = document.body.classList.contains('console-mode');
    const detailsBubble = document.getElementById('game-details-bubble');
    const hamburgerMenuButton = document.getElementById('hamburger-menu-button');
    const profileMenuButton = document.getElementById('profile-menu-button');

    // These are now initialized inside updateFocus
    let focusableElements = [];
    let gameCards = [];

    let focusedIndex = 0;
    let menuOpen = false;
    let gamepadConnected = false;
    let animationFrameId;
    let bubbleVisible = false;
    let buttonPressStates = {}; // For debouncing

    // --- GAME STATE MANAGEMENT (localStorage) ---
    function updateGameState(gameId, action) {
        if (!gameId) return;
        let favoriteGames = JSON.parse(localStorage.getItem('favoriteGames')) || [];
        let likedGames = JSON.parse(localStorage.getItem('likedGames')) || [];
        let dislikedGames = JSON.parse(localStorage.getItem('dislikedGames')) || [];

        const toggleInArray = (arr, item) => {
            const index = arr.indexOf(item);
            if (index > -1) arr.splice(index, 1);
            else arr.push(item);
        };

        const ensureNotInArray = (arr, item) => {
            const index = arr.indexOf(item);
            if (index > -1) arr.splice(index, 1);
        };

        switch (action) {
            case 'toggleFavorite':
                toggleInArray(favoriteGames, gameId);
                break;
            case 'toggleLike':
                toggleInArray(likedGames, gameId);
                ensureNotInArray(dislikedGames, gameId);
                break;
            case 'toggleDislike':
                toggleInArray(dislikedGames, gameId);
                ensureNotInArray(likedGames, gameId);
                break;
        }

        localStorage.setItem('favoriteGames', JSON.stringify(favoriteGames));
        localStorage.setItem('likedGames', JSON.stringify(likedGames));
        localStorage.setItem('dislikedGames', JSON.stringify(dislikedGames));

        if (isConsoleMode && action === 'toggleFavorite' && !favoriteGames.includes(gameId)) {
            location.reload();
        } else {
            updateBubbleButtonStates(gameId);
        }
    }

    // --- UI UPDATES ---
    function updateFocus() {
        if (menuOpen) {
            focusableElements = Array.from(document.querySelectorAll('.category-nav a:not(.hidden), .dropdown-menu a:not(.hidden)'));
        } else {
            gameCards = document.querySelectorAll('.game-card');
            focusableElements = Array.from(gameCards);
        }

        if (focusableElements.length === 0) return;

        focusableElements.forEach((el, index) => {
            if (index === focusedIndex) {
                el.classList.add('selected');
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            } else {
                el.classList.remove('selected');
            }
        });
    }

    function updateBubbleButtonStates(gameId) {
        if (!bubbleVisible || !gameId) return;

        const favoriteGames = JSON.parse(localStorage.getItem('favoriteGames')) || [];
        const likedGames = JSON.parse(localStorage.getItem('likedGames')) || [];
        const dislikedGames = JSON.parse(localStorage.getItem('dislikedGames')) || [];

        const likeBtn = detailsBubble.querySelector('.like-btn');
        const dislikeBtn = detailsBubble.querySelector('.dislike-btn');
        const favoriteBtn = detailsBubble.querySelector('.favorite-btn');

        if (likeBtn) likeBtn.classList.toggle('active', likedGames.includes(gameId));
        if (dislikeBtn) dislikeBtn.classList.toggle('active', dislikedGames.includes(gameId));
        if (favoriteBtn) favoriteBtn.classList.toggle('active', favoriteGames.includes(gameId));
    }

    function showDetailsBubble() {
        if (isConsoleMode && focusableElements[focusedIndex]) {
            const card = focusableElements[focusedIndex];
            const gameId = card.dataset.gameId;
            const gameData = allGames[gameId];

            if (gameData) {
                detailsBubble.querySelector('h3').textContent = gameId;
                detailsBubble.querySelector('img').src = gameData.thumbnail;
                detailsBubble.querySelector('p').textContent = gameData.description;
                detailsBubble.classList.remove('hidden');
                bubbleVisible = true;
                updateBubbleButtonStates(gameId);
            }
        }
    }

    function hideDetailsBubble() {
        if (isConsoleMode) {
            detailsBubble.classList.add('hidden');
            bubbleVisible = false;
        }
    }

    // --- GAMEPAD INPUT HANDLING ---
    function handleGamepadInput() {
        if (!gamepadConnected) return;
        const gamepads = navigator.getGamepads();
        if (!gamepads[0]) return;
        const gamepad = gamepads[0];

        const isButtonPressed = (buttonIndex) => {
            if (gamepad.buttons[buttonIndex].pressed) {
                if (!buttonPressStates[buttonIndex]) {
                    buttonPressStates[buttonIndex] = true;
                    return true;
                }
            } else {
                buttonPressStates[buttonIndex] = false;
            }
            return false;
        };

        if (focusableElements.length === 0) {
            updateFocus(); // Try to find elements if they appeared dynamically
            if(focusableElements.length === 0) { // If still none, exit
                 animationFrameId = requestAnimationFrame(handleGamepadInput);
                 return;
            }
        }


        // --- Navigation ---
        if (!bubbleVisible) {
            if (isButtonPressed(12)) { // D-pad Up
                focusedIndex = (focusedIndex - (menuOpen ? 1 : 4) + focusableElements.length) % focusableElements.length;
                updateFocus();
            }
            if (isButtonPressed(13)) { // D-pad Down
                focusedIndex = (focusedIndex + (menuOpen ? 1 : 4)) % focusableElements.length;
                updateFocus();
            }
            if (isButtonPressed(14)) { // D-pad Left
                focusedIndex = (focusedIndex - 1 + focusableElements.length) % focusableElements.length;
                updateFocus();
            }
            if (isButtonPressed(15)) { // D-pad Right
                focusedIndex = (focusedIndex + 1) % focusableElements.length;
                updateFocus();
            }
        }

        // --- Actions ---
        if (isButtonPressed(0)) { // 'A' button
            if (isConsoleMode && bubbleVisible) {
                const gameId = focusableElements[focusedIndex].dataset.gameId;
                updateGameState(gameId, 'toggleFavorite');
            } else if (isConsoleMode && !bubbleVisible) {
                showDetailsBubble();
            } else if (!bubbleVisible) {
                focusableElements[focusedIndex].click();
            }
        }

        if (isButtonPressed(1)) { // 'B' button
            if (isConsoleMode && bubbleVisible) {
                hideDetailsBubble();
            } else {
                window.history.back();
            }
        }

        if (isButtonPressed(8)) { // 'Select' button
            if (hamburgerMenuButton && profileMenuButton) {
                hamburgerMenuButton.click();
                profileMenuButton.click();
                menuOpen = !menuOpen;
                focusedIndex = 0;
                updateFocus();
            }
        }

        if (isConsoleMode && bubbleVisible) {
            const gameId = focusableElements[focusedIndex].dataset.gameId;
            if (isButtonPressed(2)) { // 'X' button for like
                updateGameState(gameId, 'toggleLike');
            }
            if (isButtonPressed(3)) { // 'Y' button for dislike
                updateGameState(gameId, 'toggleDislike');
            }
        } else if (isButtonPressed(3)) { // 'Y' button to favorite on main page
            const favoriteButton = focusableElements[focusedIndex].querySelector('.interaction-buttons button');
            if (favoriteButton) {
                favoriteButton.click();
            }
        }

        if (!bubbleVisible && (isButtonPressed(6) || isButtonPressed(7))) {
            const catalogs = Array.from(document.querySelectorAll('.game-catalog'));
            const currentCatalog = focusableElements[focusedIndex].closest('.game-catalog');
            let currentCatalogIndex = catalogs.indexOf(currentCatalog);

            if (isButtonPressed(7)) { // R1
                currentCatalogIndex = (currentCatalogIndex + 1) % catalogs.length;
            } else { // L1
                currentCatalogIndex = (currentCatalogIndex - 1 + catalogs.length) % catalogs.length;
            }

            catalogs[currentCatalogIndex].scrollIntoView({ behavior: 'smooth', block: 'start' });

            const newCatalogCards = catalogs[currentCatalogIndex].querySelectorAll('.game-card');
            if (newCatalogCards.length > 0) {
                focusedIndex = Array.from(document.querySelectorAll('.game-card')).indexOf(newCatalogCards[0]);
                updateFocus();
            }
        }

        animationFrameId = requestAnimationFrame(handleGamepadInput);
    }

    // --- EVENT LISTENERS ---
    window.addEventListener('gamepadconnected', (e) => {
        console.log('Gamepad connected:', e.gamepad.id);
        gamepadConnected = true;
        animationFrameId = requestAnimationFrame(handleGamepadInput);
        updateFocus();
    });

    window.addEventListener('gamepaddisconnected', () => {
        gamepadConnected = false;
        cancelAnimationFrame(animationFrameId);
        focusableElements.forEach(el => el.classList.remove('selected'));
    });

    if (isConsoleMode && detailsBubble) {
        const likeBtn = detailsBubble.querySelector('.like-btn');
        const dislikeBtn = detailsBubble.querySelector('.dislike-btn');
        const favoriteBtn = detailsBubble.querySelector('.favorite-btn');

        const getGameId = () => {
             // Re-query to be safe
            const currentCards = document.querySelectorAll('.game-card');
            return currentCards[focusedIndex] ? currentCards[focusedIndex].dataset.gameId : null;
        }

        if (likeBtn) likeBtn.addEventListener('click', () => updateGameState(getGameId(), 'toggleLike'));
        if (dislikeBtn) dislikeBtn.addEventListener('click', () => updateGameState(getGameId(), 'toggleDislike'));
        if (favoriteBtn) favoriteBtn.addEventListener('click', () => updateGameState(getGameId(), 'toggleFavorite'));
    }

    // Initial check for connected gamepads
    const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
    if (Array.from(gamepads).some(g => g)) {
        gamepadConnected = true;
        animationFrameId = requestAnimationFrame(handleGamepadInput);
        updateFocus();
    } else {
        updateFocus(); // Still run this to get initial elements for non-gamepad interaction setups
    }
}

// Initialize on DOMContentLoaded for all pages except console mode,
// where it's called manually after content is loaded.
if (!document.body.classList.contains('console-mode')) {
    document.addEventListener('DOMContentLoaded', initGamepadNavigation);
}
