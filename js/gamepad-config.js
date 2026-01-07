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


    // --- DOM ELEMENTS ---
    let modal, modalTitle, modalInstructions, initialOptions, mappingInstructions, mappingPrompt;

    // --- CORE LOGIC ---
    function initialize() {
        document.addEventListener('DOMContentLoaded', () => {
            // Cache DOM elements
            modal = document.getElementById('gamepad-config-modal');
            modalTitle = document.getElementById('modal-title');
            modalInstructions = document.getElementById('modal-instructions');
            initialOptions = document.getElementById('modal-initial-options');
            mappingInstructions = document.getElementById('modal-mapping-instructions');
            mappingPrompt = document.getElementById('mapping-prompt');

            if (initialOptions) initialOptions.addEventListener('click', handleModalOptionClick);
        });

        window.addEventListener('gamepadconnected', handleGamepadConnected);

        // Check for already-connected gamepads
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
        cancelAnimationFrame(modalAnimationFrameId); // Stop modal navigation
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
             // Allow cancellation during mapping (using a standard button, typically 'B')
            if (buttonPressedIndex === 1) {
                console.log("Mapping cancelled by user.");
                cancelMapping();
                return;
            }

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
            cancelAnimationFrame(modalAnimationFrameId);
            // Reset modal state for next time
             initialOptions.classList.remove('hidden');
            mappingInstructions.classList.add('hidden');
            modalTitle.textContent = 'Mando Desconocido Detectado';
            modalInstructions.textContent = 'No hemos podido identificar tu mando automáticamente. ¿Es una réplica o copia de alguno de estos mandos?';
        }
    }

    function updateModalFocus() {
        modalFocusableElements.forEach((el, index) => {
            el.classList.toggle('selected', index === modalFocusedIndex);
        });
    }

    function handleModalInput() {
        if (!isModalVisible || isMapping) return;

        const gamepad = navigator.getGamepads().find(g => g);
        if (!gamepad) {
            requestAnimationFrame(handleModalInput);
            return;
        }

        const isButtonPressed = (index) => {
            if (gamepad.buttons[index] && gamepad.buttons[index].pressed) {
                if (!buttonPressStates[index]) {
                    buttonPressStates[index] = true;
                    return true;
                }
            } else {
                buttonPressStates[index] = false;
            }
            return false;
        };

        let indexChanged = false;
        if (isButtonPressed(12)) { // D-Pad Up
            modalFocusedIndex = (modalFocusedIndex - 1 + modalFocusableElements.length) % modalFocusableElements.length;
            indexChanged = true;
        }
        if (isButtonPressed(13)) { // D-Pad Down
            modalFocusedIndex = (modalFocusedIndex + 1) % modalFocusableElements.length;
            indexChanged = true;
        }
        if (indexChanged) updateModalFocus();

        if (isButtonPressed(0)) { // A Button (Confirm)
            if (modalFocusableElements[modalFocusedIndex]) {
                modalFocusableElements[modalFocusedIndex].click();
            }
        }

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
