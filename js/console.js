/**
 * Console Mode Logic
 */

class ConsoleMode {
    constructor() {
        this.games = window.gamesData || [];
        this.filteredGames = [...this.games];
        this.selectedIndex = 0;
        this.gamepadType = null; // 'xbox' or 'playstation'
        this.gamepadConnected = false;
        this.animationFrameId = null;
        this.isModalActive = true;
        this.lastInputTime = 0;
        this.inputDelay = 200;

        // Elements
        this.gamesList = document.getElementById('console-games-list');
        this.searchInput = document.getElementById('console-search-input');
        this.detailsBubble = document.getElementById('game-details-bubble');
        this.detailTitle = document.getElementById('detail-title');
        this.detailStars = document.getElementById('detail-stars');
        this.detailLikes = document.getElementById('detail-likes');
        this.detailDescription = document.getElementById('detail-description');
        this.modal = document.getElementById('gamepad-modal');
        this.hints = {
            nav: document.getElementById('hint-nav'),
            select: document.getElementById('hint-select'),
            back: document.getElementById('hint-back')
        };

        this.init();
    }

    init() {
        this.renderGames();
        this.setupEventListeners();
        this.checkInitialGamepad();
        this.updateSelection();
        this.showModal();

        // Default modal selection
        this.updateModalSelection('xbox');
    }

    filterGames(term) {
        this.filteredGames = this.games.filter(g =>
            g.title.toLowerCase().includes(term) ||
            g.description.toLowerCase().includes(term)
        );
        this.selectedIndex = 0;
        this.renderGames(this.filteredGames);
        this.updateSelection();
    }

    renderGames(gamesToRender = this.filteredGames) {
        this.gamesList.innerHTML = '';
        if (gamesToRender.length === 0) {
            this.gamesList.innerHTML = '<div class="no-results" style="color: white; padding: 2rem; font-size: 1.5rem;">No games found</div>';
            return;
        }
        gamesToRender.forEach((game, index) => {
            const card = document.createElement('div');
            card.classList.add('game-card-console');
            if (index === this.selectedIndex) card.classList.add('selected');

            card.innerHTML = `<img src="${game.thumbnail}" alt="${game.title}">`;
            this.gamesList.appendChild(card);
        });
    }

    setupEventListeners() {
        // Search
        if (this.searchInput) {
            this.searchInput.addEventListener('input', (e) => {
                const term = e.target.value.toLowerCase();
                this.filterGames(term);
            });
        }

        // Modal buttons
        document.querySelectorAll('.gamepad-option').forEach(option => {
            option.addEventListener('click', () => {
                this.setGamepadType(option.dataset.type);
                this.hideModal();
            });
        });

        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => {
            console.log('Gamepad connected', e.gamepad);
            this.gamepadConnected = true;
            this.startInputLoop();
        });

        window.addEventListener('gamepaddisconnected', () => {
            this.gamepadConnected = false;
            if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);
        });
    }

    checkInitialGamepad() {
        const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        if (Array.from(gamepads).some(g => g)) {
            this.gamepadConnected = true;
            this.startInputLoop();
        }
    }

    showModal() {
        this.modal.classList.add('active');
        this.isModalActive = true;
    }

    hideModal() {
        this.modal.classList.remove('active');
        this.isModalActive = false;
        this.updateDetails();
    }

    setGamepadType(type) {
        this.gamepadType = type;
        this.updateHints();
    }

    updateHints() {
        const icons = {
            xbox: {
                nav: `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 8l-6 6h12z" fill="white"/></svg>`,
                select: `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#107C10"/><text x="12" y="17" text-anchor="middle" fill="white" font-size="12" font-family="Arial" font-weight="bold">A</text></svg>`,
                back: `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#E81123"/><text x="12" y="17" text-anchor="middle" fill="white" font-size="12" font-family="Arial" font-weight="bold">B</text></svg>`
            },
            playstation: {
                nav: `<svg viewBox="0 0 24 24" width="24" height="24"><path d="M12 8l-6 6h12z" fill="white"/></svg>`,
                select: `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#2E6DB4"/><path d="M8 8l8 8m0-8l-8 8" stroke="white" stroke-width="2"/></svg>`,
                back: `<svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="10" fill="#D32F2F" stroke="white" stroke-width="1"/></svg>`
            }
        };

        const config = icons[this.gamepadType] || icons.xbox;
        this.hints.nav.innerHTML = config.nav;
        this.hints.select.innerHTML = config.select;
        this.hints.back.innerHTML = config.back;
    }

    updateSelection() {
        const cards = document.querySelectorAll('.game-card-console');
        cards.forEach((card, index) => {
            card.classList.toggle('selected', index === this.selectedIndex);
        });

        // Center the selected game
        const containerHeight = this.gamesList.parentElement.offsetHeight;
        const cardHeight = 225; // height
        const gap = 32; // 2rem
        const itemFullHeight = cardHeight + gap;

        if (this.filteredGames.length > 0) {
            const offset = (containerHeight / 2) - (cardHeight / 2) - (this.selectedIndex * itemFullHeight);
            this.gamesList.style.transform = `translateY(${offset}px)`;
        } else {
            this.gamesList.style.transform = `translateY(0)`;
        }

        // Update details
        if (!this.isModalActive) {
            this.updateDetails();
        }
    }

    updateDetails() {
        const game = this.filteredGames[this.selectedIndex];
        if (!game) {
            this.detailsBubble.classList.remove('active');
            return;
        }

        this.detailsBubble.classList.remove('active');

        setTimeout(() => {
            this.detailTitle.textContent = game.title;
            this.detailStars.innerHTML = `⭐ ${game.stars}`;
            this.detailLikes.innerHTML = `❤️ ${game.likes}`;
            this.detailDescription.textContent = game.description;
            this.detailsBubble.classList.add('active');
        }, 300);
    }

    startInputLoop() {
        if (this.animationFrameId) cancelAnimationFrame(this.animationFrameId);

        const loop = () => {
            this.handleInput();
            this.animationFrameId = requestAnimationFrame(loop);
        };
        loop();
    }

    handleInput() {
        const now = Date.now();
        if (now - this.lastInputTime < this.inputDelay) return;

        const gamepads = navigator.getGamepads();
        const gp = Array.from(gamepads).find(g => g);
        if (!gp) return;

        // D-pad or Left Stick
        const up = gp.buttons[12]?.pressed || gp.axes[1] < -0.5;
        const down = gp.buttons[13]?.pressed || gp.axes[1] > 0.5;
        const left = gp.buttons[14]?.pressed || gp.axes[0] < -0.5;
        const right = gp.buttons[15]?.pressed || gp.axes[0] > 0.5;
        const select = gp.buttons[0]?.pressed; // A or Cross
        const back = gp.buttons[1]?.pressed; // B or Circle

        if (this.isModalActive) {
            if (left) {
                this.updateModalSelection('xbox');
                this.lastInputTime = now;
            } else if (right) {
                this.updateModalSelection('playstation');
                this.lastInputTime = now;
            } else if (select) {
                const selected = document.querySelector('.gamepad-option.selected');
                if (selected) {
                    this.setGamepadType(selected.dataset.type);
                    this.hideModal();
                    this.lastInputTime = now;
                }
            }
        } else {
            if (up && this.filteredGames.length > 0) {
                this.selectedIndex = (this.selectedIndex - 1 + this.filteredGames.length) % this.filteredGames.length;
                this.updateSelection();
                this.lastInputTime = now;
            } else if (down && this.filteredGames.length > 0) {
                this.selectedIndex = (this.selectedIndex + 1) % this.filteredGames.length;
                this.updateSelection();
                this.lastInputTime = now;
            } else if (select && this.filteredGames.length > 0) {
                console.log('Playing:', this.filteredGames[this.selectedIndex].title);
                this.lastInputTime = now;
            } else if (back) {
                window.location.href = 'index.html';
                this.lastInputTime = now;
            }
        }
    }

    updateModalSelection(type) {
        document.querySelectorAll('.gamepad-option').forEach(opt => {
            opt.classList.toggle('selected', opt.dataset.type === type);
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new ConsoleMode();
});
