document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    if (!gameId) {
        window.location.href = 'cuenta.html';
        return;
    }

    await loadCategories();
    await loadGameData(gameId);

    document.getElementById('add-achievement-btn').addEventListener('click', () => {
        addAchievementToEditor();
    });

    document.getElementById('edit-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await updateGame(gameId);
    });
});

async function loadCategories() {
    const cats = await getCategories();
    const container = document.getElementById('category-selection');
    if (cats.length > 0) {
        container.innerHTML = cats.map(cat => `
            <label class="check-container">
                <input type="checkbox" name="category" value="${cat}">
                <span class="checkmark"></span>
                ${cat}
            </label>
        `).join('');
    }
}

async function loadGameData(id) {
    try {
        const { data: game, error } = await sbClient
            .from('games')
            .select(`
                *,
                achievement_definitions (*)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;

        document.getElementById('game-name').value = game.title;
        document.getElementById('game-repo').value = game.repo_url;
        document.getElementById('game-desc').value = game.description;
        document.getElementById('game-image').value = game.image_url;
        document.getElementById('game-engine').value = game.engine || 'Otros';
        document.getElementById('game-gender').value = game.suggested_gender || 'Ambos';

        // Check categories
        if (game.categories) {
            game.categories.forEach(cat => {
                const cb = document.querySelector(`input[name="category"][value="${cat}"]`);
                if (cb) cb.checked = true;
            });
        }

        // Load achievements
        if (game.achievement_definitions) {
            game.achievement_definitions.forEach(ach => {
                addAchievementToEditor(ach);
            });
        }

    } catch (err) {
        showToast('Notificación', 'Error al cargar datos: ' + err.message);
        window.location.href = 'cuenta.html';
    }
}

function addAchievementToEditor(data = null) {
    const container = document.getElementById('achievements-list-editor');
    const div = document.createElement('div');
    div.className = 'achievement-editor-item';
    if (data?.id) div.dataset.id = data.id; // Keep track of existing IDs

    div.innerHTML = `
        <button type="button" class="btn-remove-achievement" onclick="this.parentElement.remove()">&times;</button>
        <div class="form-group">
            <label>Nombre del Logro</label>
            <input type="text" class="form-input ach-title" placeholder="Ej: Primer Paso" value="${escapeHTML(data?.title) || ''}" required>
        </div>
        <div class="form-group">
            <label>Clave (ID para API)</label>
            <input type="text" class="form-input ach-key" placeholder="Ej: primer_paso" value="${escapeHTML(data?.key) || ''}" required>
        </div>
        <div class="form-group full-width">
            <label>Descripción</label>
            <input type="text" class="form-input ach-desc" placeholder="Describe cómo se obtiene..." value="${escapeHTML(data?.description) || ''}">
        </div>
        <div class="form-group full-width">
            <label>URL Icono</label>
            <input type="url" class="form-input ach-icon" placeholder="https://..." value="${data?.icon_url || ''}">
        </div>
    `;
    container.appendChild(div);
}

function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

async function updateGame(id) {
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);

    const updateData = {
        title: document.getElementById('game-name').value,
        repo_url: document.getElementById('game-repo').value,
        description: document.getElementById('game-desc').value,
        image_url: fixGitHubImageUrl(document.getElementById('game-image').value),
        engine: document.getElementById('game-engine').value,
        suggested_gender: document.getElementById('game-gender').value,
        categories: categories,
        last_updated: new Date().toISOString()
    };

    try {
        const { error } = await sbClient
            .from('games')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        // Save Achievements (UPSERT to avoid data loss on earned achievements)
        const achItems = document.querySelectorAll('.achievement-editor-item');
        const achievements = Array.from(achItems).map(item => {
            const achData = {
                game_id: id,
                title: item.querySelector('.ach-title').value,
                key: item.querySelector('.ach-key').value,
                description: item.querySelector('.ach-desc').value,
                icon_url: fixGitHubImageUrl(item.querySelector('.ach-icon').value)
            };
            if (item.dataset.id) achData.id = item.dataset.id;
            return achData;
        });

        if (achievements.length > 0) {
            const { error: achErr } = await sbClient
                .from('achievement_definitions')
                .upsert(achievements, { onConflict: 'game_id, key' });
            if (achErr) console.error('Error al guardar logros:', achErr);
        }

        // Optional: Delete removed achievements (careful with data loss, but user clicked remove)
        // For a more robust system, we'd compare current vs old IDs.

        showToast('Notificación', 'Cambios guardados con éxito. Se ha enviado una notificación de revisión.');
        window.location.href = 'cuenta.html';
    } catch (err) {
        showToast('Notificación', 'Error: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
    }
}
