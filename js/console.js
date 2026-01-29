const ConsoleMode = {
    state: {
        section: 'games', // 'header', 'categories', 'games', 'info', 'keyboard', 'details'
        row: 1,
        col: 0,
        headerCol: 0, // 0: search, 1: profile
        catIndex: 1,
        infoCol: 3, // 'More Details'
        kbRow: 0,
        kbCol: 0,
        categories: [],
        masterGames: [], // Full list of games by category
        filteredGames: [], // Currently displayed games
        searchQuery: '',
        favorites: JSON.parse(localStorage.getItem('favoriteGames') || '[]')
    },

    init: function() {
        console.log("Initializing Console Mode...");
        this.loadGames();
        this.renderCategories();
        this.renderGames();
        this.updateFocus();
        this.initEventListeners();
        this.startGamepadLoop();
    },

    loadGames: function() {
        const categories = {};
        Object.keys(allGames).forEach(title => {
            const cat = allGames[title].category;
            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(title);
        });

        this.state.categories = ['Favoritos', 'Todos', ...Object.keys(categories)];
        this.state.masterGames = this.state.categories.map(cat => {
            if (cat === 'Favoritos') {
                return this.state.favorites.map(title => ({ id: title, ...allGames[title] }));
            }
            if (cat === 'Todos') {
                return Object.keys(allGames).map(title => ({ id: title, ...allGames[title] }));
            }
            return categories[cat].map(title => ({ id: title, ...allGames[title] }));
        });

        this.state.filteredGames = [...this.state.masterGames];
    },

    renderCategories: function() {
        const nav = document.getElementById('category-nav');
        nav.innerHTML = this.state.categories.map((cat, i) => `
            <div class="category-btn ${i === this.state.catIndex && this.state.section === 'categories' ? 'selected' : ''}" data-index="${i}">
                ${cat}
            </div>
        `).join('');
    },

    renderGames: function() {
        const main = document.getElementById('main-content');
        main.innerHTML = this.state.categories.map((cat, i) => {
            const games = this.state.filteredGames[i];

            // We always render a row div to maintain the index mapping (row <-> i)
            let gamesHtml = '';
            if (!games || games.length === 0) {
                const msg = cat === 'Favoritos' ? 'No tienes juegos favoritos aún.' : 'No se encontraron juegos.';
                gamesHtml = `<p class="empty-msg">${msg}</p>`;
            } else {
                gamesHtml = `
                    <div class="game-carousel">
                        ${games.map((game, j) => `
                            <div class="game-card ${i === this.state.row && j === this.state.col && this.state.section === 'games' ? 'selected' : ''}"
                                 data-row="${i}" data-col="${j}">
                                <img src="${game.thumbnail}" alt="${game.id}">
                            </div>
                        `).join('')}
                    </div>
                `;
            }

            return `
                <div class="carousel-row" id="row-${i}">
                    <h2>${cat}</h2>
                    ${gamesHtml}
                </div>
            `;
        }).join('');
    },

    updateFocus: function() {
        document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

        if (this.state.section === 'header') {
            const search = document.getElementById('search-container');
            const profile = document.getElementById('profile-btn');
            if (this.state.headerCol === 0) search.classList.add('selected');
            else profile.classList.add('selected');
        } else if (this.state.section === 'categories') {
            const cats = document.querySelectorAll('.category-btn');
            if (cats[this.state.catIndex]) cats[this.state.catIndex].classList.add('selected');
        } else if (this.state.section === 'games') {
            const rows = document.querySelectorAll('.carousel-row');
            const currentRow = rows[this.state.row];
            if (currentRow) {
                const cards = currentRow.querySelectorAll('.game-card');
                if (cards[this.state.col]) {
                    cards[this.state.col].classList.add('selected');
                    cards[this.state.col].scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
                } else {
                    // Fallback scroll to row if no cards
                    currentRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
            this.updateInfoBar();
        } else if (this.state.section === 'info') {
            this.updateInfoBar();
        } else if (this.state.section === 'keyboard') {
            this.renderKeyboard();
        }

        const infoBar = document.getElementById('info-bar');
        if (this.state.section === 'games' || this.state.section === 'info') {
            infoBar.style.transform = 'translateY(0)';
        } else if (this.state.section !== 'details') {
            infoBar.style.transform = 'translateY(100%)';
        }
    },

    updateInfoBar: function() {
        const currentRowGames = this.state.filteredGames[this.state.row];
        const infoBar = document.getElementById('info-bar');

        if (!currentRowGames || currentRowGames.length === 0) {
            infoBar.style.transform = 'translateY(100%)';
            return;
        }

        const game = currentRowGames[this.state.col];
        if (!game) {
            infoBar.style.transform = 'translateY(100%)';
            return;
        }

        const isInfo = this.state.section === 'info';

        infoBar.innerHTML = `
            <div class="info-main">
                <h2 class="info-game-title">${game.id}</h2>
                <div class="info-meta">
                    <div class="info-actions">
                        <button class="info-btn ${isInfo && this.state.infoCol === 0 ? 'selected' : ''}" data-action="like">
                            <img src="images/icons/like.svg" alt="Like">
                        </button>
                        <button class="info-btn ${isInfo && this.state.infoCol === 1 ? 'selected' : ''}" data-action="dislike">
                            <img src="images/icons/dislike.svg" alt="Dislike">
                        </button>
                        <button class="info-btn ${isInfo && this.state.infoCol === 2 ? 'selected' : ''}" data-action="favorite">
                            <img src="images/icons/favorite.svg" alt="Favorite">
                        </button>
                    </div>
                    <div class="info-compatibility">
                        ${(game.platforms || []).map(p => {
                            let icon = 'pc';
                            if (p === 'console') icon = 'console';
                            if (p === 'mobile') icon = 'mobile';
                            if (p === 'tv') icon = 'tv';
                            return `<img src="images/icons/${icon}.svg" class="comp-icon" alt="${p}">`;
                        }).join('')}
                    </div>
                </div>
            </div>
            <div class="info-details-trigger">
                <button class="details-toggle-btn ${isInfo && this.state.infoCol === 3 ? 'selected' : ''}" id="details-trigger-btn">
                    Más Detalles
                </button>
            </div>
        `;
    },

    showDetails: function() {
        const game = this.state.filteredGames[this.state.row][this.state.col];
        if (!game) return;

        const content = document.getElementById('details-content');
        content.innerHTML = `
            <div class="details-body">
                <h3>Descripción</h3>
                <p>${game.description || 'No hay descripción disponible para este juego.'}</p>

                <h3>Controles</h3>
                <div class="controls-info">
                    <p>${game.controls || 'Usa las flechas para moverte y Enter para interactuar.'}</p>
                </div>

                <h3>Desarrollador</h3>
                <p>${game.developer || 'Creative Game Studios'}</p>
            </div>
        `;
        document.getElementById('details-panel').classList.add('active');
        this.state.section = 'details';
    },

    hideDetails: function() {
        document.getElementById('details-panel').classList.remove('active');
        this.state.section = 'info';
        this.updateFocus();
    },

    handleInput: function(action) {
        console.log(`Input: ${action}, Section: ${this.state.section}`);
        if (this.state.section === 'details') {
            if (action === 'back' || action === 'enter') this.hideDetails();
            return;
        }

        if (this.state.section === 'keyboard') {
            this.handleKeyboardInput(action);
            return;
        }

        switch(action) {
            case 'up':
                if (this.state.section === 'info') this.state.section = 'games';
                else if (this.state.section === 'games') {
                    if (this.state.row > 0) this.state.row--;
                    else this.state.section = 'categories';
                } else if (this.state.section === 'categories') {
                    this.state.section = 'header';
                }
                break;
            case 'down':
                if (this.state.section === 'header') this.state.section = 'categories';
                else if (this.state.section === 'categories') this.state.section = 'games';
                else if (this.state.section === 'games') {
                    if (this.state.row < this.state.filteredGames.length - 1) this.state.row++;
                    else {
                        // Only move to info bar if current row has games
                        const currentRow = this.state.filteredGames[this.state.row];
                        if (currentRow && currentRow.length > 0) this.state.section = 'info';
                    }
                }
                break;
            case 'left':
                if (this.state.section === 'header') this.state.headerCol = 0;
                else if (this.state.section === 'categories') {
                    if (this.state.catIndex > 0) this.state.catIndex--;
                } else if (this.state.section === 'games') {
                    if (this.state.col > 0) this.state.col--;
                } else if (this.state.section === 'info') {
                    if (this.state.infoCol > 0) this.state.infoCol--;
                }
                break;
            case 'right':
                if (this.state.section === 'header') this.state.headerCol = 1;
                else if (this.state.section === 'categories') {
                    if (this.state.catIndex < this.state.categories.length - 1) this.state.catIndex++;
                } else if (this.state.section === 'games') {
                    const rowLen = this.state.filteredGames[this.state.row]?.length || 0;
                    if (this.state.col < rowLen - 1) this.state.col++;
                } else if (this.state.section === 'info') {
                    if (this.state.infoCol < 3) this.state.infoCol++;
                }
                break;
            case 'enter':
                if (this.state.section === 'header') {
                    if (this.state.headerCol === 0) {
                        this.state.section = 'keyboard';
                        document.getElementById('keyboard-overlay').classList.remove('hidden');
                    } else {
                        window.location.href = 'configuracion.html';
                    }
                } else if (this.state.section === 'categories') {
                    this.state.row = this.state.catIndex;
                    this.state.section = 'games';
                    this.state.col = 0;
                } else if (this.state.section === 'games') {
                    const game = this.state.filteredGames[this.state.row][this.state.col];
                    if (game) window.location.href = `play.html?game=${encodeURIComponent(game.id)}`;
                } else if (this.state.section === 'info') {
                    if (this.state.infoCol === 3) this.showDetails();
                    else this.handleInfoAction();
                }
                break;
            case 'back':
                if (this.state.section !== 'games') {
                    this.state.section = 'games';
                }
                break;
        }
        this.updateFocus();
    },

    handleInfoAction: function() {
        const game = this.state.filteredGames[this.state.row][this.state.col];
        const actions = ['like', 'dislike', 'favorite'];
        const action = actions[this.state.infoCol];
        if (action === 'favorite') {
            const index = this.state.favorites.indexOf(game.id);
            if (index > -1) this.state.favorites.splice(index, 1);
            else this.state.favorites.push(game.id);
            localStorage.setItem('favoriteGames', JSON.stringify(this.state.favorites));
            this.loadGames(); // Refresh list
            this.renderGames();
        }
    },

    keyboardLayout: [
        ['1','2','3','4','5','6','7','8','9','0'],
        ['Q','W','E','R','T','Y','U','I','O','P'],
        ['A','S','D','F','G','H','J','K','L','Ñ'],
        ['Z','X','C','V','B','N','M',',','.','BKSP'],
        ['SPACE', 'DONE']
    ],

    renderKeyboard: function() {
        const keysDiv = document.getElementById('keyboard-keys');
        keysDiv.innerHTML = this.keyboardLayout.map((row, i) => `
            <div class="kb-row">
                ${row.map((key, j) => {
                    const isSelected = this.state.kbRow === i && this.state.kbCol === j;
                    let className = 'kb-btn';
                    if (key === 'SPACE') className += ' wide';
                    if (key === 'DONE') className += ' extra-wide';
                    if (isSelected) className += ' selected';
                    return `<button class="${className}" data-row="${i}" data-col="${j}">${key}</button>`;
                }).join('')}
            </div>
        `).join('');

        document.getElementById('keyboard-input').value = this.state.searchQuery;
    },

    handleKeyboardInput: function(action) {
        const row = this.keyboardLayout[this.state.kbRow];

        switch(action) {
            case 'up': if (this.state.kbRow > 0) this.state.kbRow--; break;
            case 'down': if (this.state.kbRow < 4) this.state.kbRow++; break;
            case 'left': if (this.state.kbCol > 0) this.state.kbCol--; break;
            case 'right': if (this.state.kbCol < row.length - 1) this.state.kbCol++; break;
            case 'enter':
                const key = row[this.state.kbCol];
                if (key === 'BKSP') {
                    this.state.searchQuery = this.state.searchQuery.slice(0, -1);
                } else if (key === 'SPACE') {
                    this.state.searchQuery += ' ';
                } else if (key === 'DONE') {
                    this.closeKeyboard();
                } else if (key) {
                    this.state.searchQuery += key;
                }
                this.filterGames();
                break;
            case 'back':
                this.closeKeyboard();
                break;
        }

        // Adjust kbCol if moving to a shorter row
        const newRow = this.keyboardLayout[this.state.kbRow];
        if (this.state.kbCol >= newRow.length) {
            this.state.kbCol = newRow.length - 1;
        }

        this.renderKeyboard();
    },

    closeKeyboard: function() {
        document.getElementById('keyboard-overlay').classList.add('hidden');
        this.state.section = 'header';
        this.state.headerCol = 0;
        this.updateFocus();
    },

    filterGames: function() {
        const query = this.state.searchQuery.toLowerCase();
        if (!query) {
            this.state.filteredGames = [...this.state.masterGames];
        } else {
            this.state.filteredGames = this.state.masterGames.map(row =>
                row.filter(game => game.id.toLowerCase().includes(query))
            );
        }
        this.renderGames();
        this.updateFocus();
    },

    initEventListeners: function() {
        window.addEventListener('keydown', (e) => {
            const map = {
                'ArrowUp': 'up', 'ArrowDown': 'down', 'ArrowLeft': 'left', 'ArrowRight': 'right',
                'Enter': 'enter', 'Escape': 'back', 'Backspace': 'back'
            };
            if (map[e.key]) {
                e.preventDefault();
                this.handleInput(map[e.key]);
            }
        });

        document.getElementById('close-details').addEventListener('click', () => this.hideDetails());
        document.getElementById('keyboard-done').addEventListener('click', () => this.closeKeyboard());
    },

    startGamepadLoop: function() {
        const poll = () => {
            const gamepads = navigator.getGamepads();
            if (gamepads[0]) {
                const gp = gamepads[0];

                if (!this.lastInputTime) this.lastInputTime = 0;
                const now = Date.now();
                if (now - this.lastInputTime < 200) {
                    requestAnimationFrame(poll);
                    return;
                }

                let action = null;
                if (gp.axes[1] < -0.5 || gp.buttons[12].pressed) action = 'up';
                else if (gp.axes[1] > 0.5 || gp.buttons[13].pressed) action = 'down';
                else if (gp.axes[0] < -0.5 || gp.buttons[14].pressed) action = 'left';
                else if (gp.axes[0] > 0.5 || gp.buttons[15].pressed) action = 'right';
                else if (gp.buttons[0].pressed) action = 'enter';
                else if (gp.buttons[1].pressed) action = 'back';

                if (action) {
                    this.handleInput(action);
                    this.lastInputTime = now;
                }
            }
            requestAnimationFrame(poll);
        };
        poll();
    }
};

document.addEventListener('DOMContentLoaded', () => ConsoleMode.init());
