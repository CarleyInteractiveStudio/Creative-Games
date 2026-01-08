// IIFE to encapsulate all configuration logic and avoid polluting the global scope.
(function() {
    'use strict';

    // --- PRE-DEFINED CONTROLLER MAPPINGS (Standard Gamepad API Layout) ---
    const PRESET_MAPPINGS = {
        'xbox': { CONFIRM: 0, CANCEL: 1, LIKE: 2, DISLIKE: 3, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 },
        'playstation': { CONFIRM: 0, CANCEL: 1, LIKE: 2, DISLIKE: 3, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 },
        'nintendo': { CONFIRM: 1, CANCEL: 0, LIKE: 3, DISLIKE: 2, PREV_CATALOG: 4, NEXT_CATALOG: 5, MENU: 8, START: 9, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15 }
    };

    let isMapping = false;

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
    let modal, assistantOptions;

    // --- CORE LOGIC ---
    function initialize() {
        document.addEventListener('DOMContentLoaded', () => {
            modal = document.getElementById('gamepad-config-modal');
            assistantOptions = document.getElementById('assistant-options');
            if (assistantOptions) assistantOptions.addEventListener('click', handleAssistantOptionClick);
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
            saveGamepadConfig(gamepad.id, profile, PRESET_MAPPINGS[profile]);
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

    // --- MODAL & ADOPTION ASSISTANT FLOW ---
    const ASSISTANT_QUESTIONS = {
        'start': {
            questionText: 'Observa los botones de acción principales (normalmente a la derecha). ¿Cómo están posicionados?',
            answers: [
                { text: 'En forma de cruz (+)', next: 'result-nintendo' },
                { text: 'En forma de diamante (◆)', next: 'sticks' }
            ]
        },
        'sticks': {
            questionText: 'Ahora, mira las palancas analógicas. ¿Están paralelas (ambas abajo) o está la izquierda más arriba?',
            answers: [
                { text: 'Paralelas (simétricas)', next: 'result-playstation' },
                { text: 'La izquierda más arriba (asimétrica)', next: 'result-xbox' }
            ]
        }
    };
    let currentQuestionKey = 'start';

    function startAdoptionAssistant() {
        currentQuestionKey = 'start';
        displayQuestion(ASSISTANT_QUESTIONS[currentQuestionKey]);
        modalAnimationFrameId = requestAnimationFrame(handleModalInput);
    }

    function displayQuestion(q) {
        const questionEl = document.getElementById('assistant-question');
        const optionsEl = document.getElementById('assistant-options');

        if (questionEl) questionEl.textContent = q.questionText;
        if (optionsEl) {
            optionsEl.innerHTML = ''; // Clear old options
            q.answers.forEach(answer => {
                const button = document.createElement('button');
                button.className = 'modal-button';
                button.textContent = answer.text;
                button.dataset.next = answer.next;
                optionsEl.appendChild(button);
            });
            // Update focusable elements for gamepad navigation
            modalFocusableElements = Array.from(optionsEl.querySelectorAll('.modal-button'));
            modalFocusedIndex = 0;
            updateModalFocus();
        }
    }

    function handleAssistantOptionClick(e) {
        if (!e.target.classList.contains('modal-button')) return;

        const next = e.target.dataset.next;
        const gamepad = navigator.getGamepads().find(g => g);
        if (!gamepad) {
             hideModal();
             return;
        };

        if (next.startsWith('result-')) {
            const profile = next.replace('result-', '');
            saveGamepadConfig(gamepad.id, profile, PRESET_MAPPINGS[profile]);
            hideModal();
            window.dispatchEvent(new CustomEvent('gamepadConfigured', { detail: { gamepad } }));
        } else {
            currentQuestionKey = next;
            displayQuestion(ASSISTANT_QUESTIONS[currentQuestionKey]);
        }
    }


    // --- UI HELPERS ---
    function showModal() {
        if (modal) {
            modal.classList.remove('hidden');
            isModalVisible = true;
            modalFocusedIndex = 0;
            learnedAxis = null;
            learnedButton = null;
            startAdoptionAssistant(); // Kick off the new assistant
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
    function saveGamepadConfig(id, profileName, config) {
        try {
            const configs = JSON.parse(localStorage.getItem('gamepadConfigs')) || {};
            configs[id] = config;
            localStorage.setItem('gamepadConfigs', JSON.stringify(configs));
            localStorage.setItem('gamepadProfile', profileName); // Also save the profile name
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
    window.getCurrentGamepadProfile = function() {
        return localStorage.getItem('gamepadProfile');
    };

    // --- KICK IT OFF ---
    initialize();

})();
