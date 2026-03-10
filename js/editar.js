document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const gameId = urlParams.get('id');

    if (!gameId) {
        window.location.href = 'cuenta.html';
        return;
    }

    await loadCategories();
    await loadGameData(gameId);

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
            .select('*')
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

    } catch (err) {
        alert('Error al cargar datos: ' + err.message);
        window.location.href = 'cuenta.html';
    }
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
        updated_at: new Date().toISOString()
    };

    try {
        const { error } = await sbClient
            .from('games')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        alert('Cambios guardados con éxito. Se ha enviado una notificación de revisión.');
        window.location.href = 'cuenta.html';
    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar Cambios';
    }
}
