// IIFE to encapsulate all configuration logic and avoid polluting the global scope.
(function() {
    'use strict';

    // --- PRE-DEFINED CONTROLLER MAPPINGS (Standard Gamepad API Layout) ---
    const PRESET_MAPPINGS = {
        'xbox': { CONFIRM: 0, CANCEL: 1, LIKE: 2, DISLIKE: 3, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 },
        'playstation': { CONFIRM: 0, CANCEL: 1, LIKE: 2, DISLIKE: 3, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 },
        'nintendo': { CONFIRM: 1, CANCEL: 0, LIKE: 3, DISLIKE: 2, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 }
    };

    const MAPPING_ACTIONS = ['CONFIRM', 'CANCEL', 'UP', 'DOWN', 'LEFT', 'RIGHT', 'MENU', 'START', 'LIKE', 'DISLIKE', 'PREV_CATALOG', 'NEXT_CATALOG'];
    let currentMappingActionIndex = 0;
    let tempMapping = {};
    let isMapping = false;
    let buttonPressStates = {};

    // --- MODAL STATE ---
    let isModalVisible = false;
    let modalFocusableElements = [];
    let modalFocusedIndex = 0;
    let modalAnimationFrameId;
    let lastStickMoveTime = 0;
    const STICK_COOLDOWN = 200;
    let learnedAxis = null; // To dynamically learn which axis the user moves
    let learnedButton = null; // To dynamically learn which button the user presses


    // --- DOM ELEMENTS ---
    let modal, modalTitle, modalInstructions, initialOptions, mappingInstructions, mappingPrompt;

    // --- CORE LOGIC ---
    function initialize() {
        document.addEventListener('DOMContentLoaded', () => {
            modal = document.getElementById('gamepad-config-modal');
            modalTitle = document.getElementById('modal-title');
            modalInstructions = document.getElementById('modal-instructions');
            initialOptions = document.getElementById('modal-initial-options');
            mappingInstructions = document.getElementById('modal-mapping-instructions');
            mappingPrompt = document.getElementById('mapping-prompt');
            if (initialOptions) initialOptions.addEventListener('click', handleModalOptionClick);
        });

        window.addEventListener('gamepadconnected', handleGamepadConnected);
        setTimeout(() => {
            const gp = Array.from(navigator.getGamepads()).find(g => g);
            if (gp) handleGamepadConnected({ gamepad: gp });
        }, 500);
    }

    function handleGamepadConnected(e) {
        const gamepad = e.gamepad;
        if (getGamepadConfig(gamepad.id)) {
            window.dispatchEvent(new CustomEvent('gamepadConfigured', { detail: { gamepad } }));
            return;
        }
        const profile = detectGamepadProfile(gamepad);
        if (profile) {
            saveGamepadConfig(gamepad.id, PRESET_MAPPINGS[profile]);
            window.dispatchEvent(new CustomEvent('gamepadConfigured', { detail: { gamepad } }));
        } else {
            showModal();
        }
    }

    function detectGamepadProfile(gamepad) {
        const id = gamepad.id.toLowerCase();
        if (id.includes('xbox') || id.includes('xinput')) return 'xbox';
        if (id.includes('wireless controller') || id.includes('playstation')) return 'playstation';
        if (id.includes('nintendo')) return 'nintendo';
        return null;
    }

    // --- MODAL & MAPPING FLOW ---
    function handleModalOptionClick(e) {
        if (!e.target.classList.contains('modal-button')) return;
        const type = e.target.dataset.type;
        const gamepad = navigator.getGamepads().find(g => g);
        if (!gamepad) return;

        if (type.startsWith('replica-')) {
            const profile = type.replace('replica-', '');
            saveGamepadConfig(gamepad.id, PRESET_MAPPINGS[profile]);
            hideModal();
            window.dispatchEvent(new CustomEvent('gamepadConfigured', { detail: { gamepad } }));
        } else if (type === 'other') {
            startManualMapping();
        }
    }

    function startManualMapping() {
        cancelAnimationFrame(modalAnimationFrameId);
        isMapping = true;
        initialOptions.classList.add('hidden');
        mappingInstructions.classList.remove('hidden');
        modalTitle.textContent = 'Configuración Manual';
        modalInstructions.textContent = 'Presiona el botón solicitado en tu mando.';
        currentMappingActionIndex = 0;
        tempMapping = {};
        buttonPressStates = {};
        promptNextButton();
    }

    function promptNextButton() {
        if (currentMappingActionIndex >= MAPPING_ACTIONS.length) {
            finishManualMapping();
            return;
        }
        const action = MAPPING_ACTIONS[currentMappingActionIndex];
        mappingPrompt.textContent = `Presiona: ${action}`;
        requestAnimationFrame(listenForMappingInput);
    }

    function listenForMappingInput() {
        if (!isMapping) return;
        const gamepad = navigator.getGamepads().find(g => g);
        if (!gamepad) {
            cancelMapping();
            return;
        }

        let buttonPressedIndex = -1;
        for (let i = 0; i < gamepad.buttons.length; i++) {
            if (gamepad.buttons[i].pressed) {
                if (!buttonPressStates[i]) {
                    buttonPressStates[i] = true;
                    buttonPressedIndex = i;
                    break;
                }
            } else {
                buttonPressStates[i] = false;
            }
        }

        if (buttonPressedIndex !== -1) {
            const action = MAPPING_ACTIONS[currentMappingActionIndex];
            tempMapping[action] = buttonPressedIndex;
            currentMappingActionIndex++;
            promptNextButton();
        } else {
            requestAnimationFrame(listenForMappingInput);
        }
    }

    function finishManualMapping() {
        const gamepad = navigator.getGamepads().find(g => g);
        if (gamepad) {
            saveGamepadConfig(gamepad.id, tempMapping);
            window.dispatchEvent(new CustomEvent('gamepadConfigured', { detail: { gamepad } }));
        }
        hideModal();
    }

    function cancelMapping() {
        hideModal();
    }

    // --- UI HELPERS ---
    function showModal() {
        if (modal) {
            modal.classList.remove('hidden');
            isModalVisible = true;
            modalFocusedIndex = 0;
            modalFocusableElements = Array.from(initialOptions.querySelectorAll('.modal-button'));
            updateModalFocus();
            modalAnimationFrameId = requestAnimationFrame(handleModalInput);
        }
    }

    function hideModal() {
        if (modal) {
            modal.classList.add('hidden');
            isModalVisible = false;
            isMapping = false;
            learnedAxis = null; // Reset learned controls
            learnedButton = null;
            cancelAnimationFrame(modalAnimationFrameId);
            initialOptions.classList.remove('hidden');
            mappingInstructions.classList.add('hidden');
            modalTitle.textContent = 'Mando Desconocido Detectado';
        }
    }

    function updateModalFocus() {
        modalFocusableElements.forEach((el, index) => {
            el.classList.toggle('selected', index === modalFocusedIndex);
        });
    }

    // --- ADVANCED DEBOUNCING & MODAL INPUT HANDLING ---
    const modalButtonStates = {}; // Tracks button states specifically for debouncing in the modal.

    function isButtonPressed(gamepad, buttonIndex) {
        if (buttonIndex === null || !gamepad || !gamepad.buttons[buttonIndex]) {
            return false;
        }
        const isPressed = gamepad.buttons[buttonIndex].pressed;
        const wasPressed = modalButtonStates[buttonIndex] || false;
        modalButtonStates[buttonIndex] = isPressed; // Update state for the next frame
        return isPressed && !wasPressed; // Return true only on the rising edge (press down)
    }

    function handleModalInput() {
        if (!isModalVisible || isMapping) return;

        const gamepad = navigator.getGamepads().find(g => g);
        if (!gamepad) {
            requestAnimationFrame(handleModalInput);
            return;
        }

        let indexChanged = false;

        // --- DYNAMIC CONTROL LEARNING ---
        if (learnedAxis === null) {
            for (let i = 0; i < gamepad.axes.length; i++) {
                if (Math.abs(gamepad.axes[i]) > 0.7 && i % 2 !== 0) {
                    learnedAxis = i;
                    break;
                }
            }
        }

        if (learnedButton === null) {
            for (let i = 0; i < gamepad.buttons.length; i++) {
                if (isButtonPressed(gamepad, i)) { // Use debounced check
                    learnedButton = i;
                    break;
                }
            }
        }

        // --- NAVIGATION LOGIC ---
        const now = Date.now();
        if (now - lastStickMoveTime > STICK_COOLDOWN) {
            let verticalMove = 0;
            if (learnedAxis !== null && Math.abs(gamepad.axes[learnedAxis]) > 0.7) {
                verticalMove = gamepad.axes[learnedAxis];
            } else if (learnedAxis === null) { // Fallback to D-pad only if no axis is learned
                if (gamepad.buttons[12]?.pressed) verticalMove = -1;
                if (gamepad.buttons[13]?.pressed) verticalMove = 1;
            }

            if (verticalMove < -0.5) { // Up
                modalFocusedIndex = (modalFocusedIndex - 1 + modalFocusableElements.length) % modalFocusableElements.length;
                indexChanged = true;
                lastStickMoveTime = now;
            } else if (verticalMove > 0.5) { // Down
                modalFocusedIndex = (modalFocusedIndex + 1) % modalFocusableElements.length;
                indexChanged = true;
                lastStickMoveTime = now;
            }
        }

        if (indexChanged) updateModalFocus();

        // --- CONFIRMATION LOGIC ---
        // Use the debounced function with the learned button. Fallback to 0 if not learned yet.
        const confirmButtonIndex = learnedButton !== null ? learnedButton : 0;
        if (isButtonPressed(gamepad, confirmButtonIndex)) {
            if (modalFocusableElements[modalFocusedIndex]) {
                modalFocusableElements[modalFocusedIndex].click();
            }
        }

        // The separate state update loop is no longer needed as isButtonPressed handles its own state.
        modalAnimationFrameId = requestAnimationFrame(handleModalInput);
    }


    // --- LOCALSTORAGE HELPERS ---
    function saveGamepadConfig(id, config) {
        try {
            const configs = JSON.parse(localStorage.getItem('gamepadConfigs')) || {};
            configs[id] = config;
            localStorage.setItem('gamepadConfigs', JSON.stringify(configs));
        } catch (e) { console.error("Could not save gamepad config", e); }
    }

    function getGamepadConfig(id) {
        try {
            const configs = JSON.parse(localStorage.getItem('gamepadConfigs')) || {};
            return configs[id] || null;
        } catch (e) { console.error("Could not get gamepad config", e); return null; }
    }

    // --- GLOBAL ACCESSOR ---
    window.getCurrentGamepadConfig = function() {
        const gamepad = navigator.getGamepads().find(g => g);
        return gamepad ? getGamepadConfig(gamepad.id) : null;
    };

    // --- KICK IT OFF ---
    initialize();

})();
