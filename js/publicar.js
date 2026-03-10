document.addEventListener('DOMContentLoaded', () => {
    initWizard();
});

let currentStep = 1;
const totalSteps = 5;

// DOM Elements
const steps = document.querySelectorAll('.step-content');
const stepIndicators = document.querySelectorAll('.step');
const prevBtn = document.getElementById('prev-btn');
const nextBtn = document.getElementById('next-btn');
const submitBtn = document.getElementById('submit-btn');
const previewIframe = document.getElementById('game-preview-iframe');
const refreshPreviewBtn = document.getElementById('refresh-preview');

async function initWizard() {
    setupListeners();
    updateUI();
    await renderCategoryOptions();
}

async function renderCategoryOptions() {
    const cats = await getCategories();
    const container = document.getElementById('category-selection');
    if (!container) return;

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

function setupListeners() {
    // Device-based controls display
    const deviceCheckboxes = document.querySelectorAll('input[name="device"]');
    deviceCheckboxes.forEach(cb => {
        cb.addEventListener('change', () => {
            const container = document.getElementById('controls-config-container');
            const anyChecked = Array.from(deviceCheckboxes).some(c => c.checked);

            if (anyChecked) container.classList.remove('hidden');
            else container.classList.add('hidden');

            // Toggle individual textareas
            document.getElementById(`group-controls-${cb.value}`).classList.toggle('hidden', !cb.checked);
        });
    });

    nextBtn.addEventListener('click', () => {
        if (validateStep(currentStep)) {
            currentStep++;
            updateUI();
        }
    });

    prevBtn.addEventListener('click', () => {
        currentStep--;
        updateUI();
    });

    refreshPreviewBtn.addEventListener('click', () => {
        updatePreview();
    });

    // Handle form submission
    document.getElementById('publish-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        await publishGame();
    });
}

function validateStep(step) {
    const currentContainer = document.getElementById(`step-${step}`);
    const inputs = currentContainer.querySelectorAll('input[required], textarea[required], select[required]');

    let valid = true;
    inputs.forEach(input => {
        if (!input.value.trim() && input.type !== 'checkbox') {
            valid = false;
            input.classList.add('error');
        } else if (input.type === 'checkbox' && !input.checked) {
            valid = false;
        } else {
            input.classList.remove('error');
        }
    });

    if (!valid) {
        alert('Por favor, completa todos los campos requeridos y acepta las políticas.');
    }

    return valid;
}

function updateUI() {
    // Show/Hide steps
    steps.forEach((s, index) => {
        if (index + 1 === currentStep) {
            s.classList.remove('hidden');
        } else {
            s.classList.add('hidden');
        }
    });

    // Update Indicators
    stepIndicators.forEach((ind, index) => {
        const stepNum = index + 1;
        ind.classList.remove('active', 'completed');
        if (stepNum === currentStep) {
            ind.classList.add('active');
        } else if (stepNum < currentStep) {
            ind.classList.add('completed');
        }
    });

    // Update Nav Buttons
    if (currentStep === 1) {
        prevBtn.classList.add('hidden');
    } else {
        prevBtn.classList.remove('hidden');
    }

    if (currentStep === totalSteps) {
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
        updatePreview();
    } else {
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    }
}

/**
 * Converts a standard GitHub blob URL to a raw content URL
 * @param {string} url
 * @returns {string}
 */
function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

function updatePreview() {
    const repoUrl = document.getElementById('game-repo').value;
    const imageUrl = document.getElementById('game-image').value;

    if (repoUrl) {
        previewIframe.src = repoUrl;
    }

    // Try to update cover image in a real preview if we had one,
    // for now we just log the fix
    console.log("Image URL processed:", fixGitHubImageUrl(imageUrl));
}

async function publishGame() {
    const session = await getSession();
    if (!session) {
        alert('Debes iniciar sesión para publicar un juego.');
        return;
    }

    const name = document.getElementById('game-name').value;
    const repo = document.getElementById('game-repo').value;
    const desc = document.getElementById('game-desc').value;
    const image = fixGitHubImageUrl(document.getElementById('game-image').value);

    const categories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(cb => cb.value);
    const devices = Array.from(document.querySelectorAll('input[name="device"]:checked')).map(cb => cb.value);
    const ages = Array.from(document.querySelectorAll('input[name="age"]:checked')).map(cb => cb.value);
    const gender = document.getElementById('game-gender').value;
    const engine = document.getElementById('game-engine').value;

    const gameData = {
        user_id: session.user.id,
        title: name,
        description: desc,
        image_url: image,
        repo_url: repo,
        categories: categories,
        devices: devices,
        suggested_gender: gender,
        engine: engine,
        age_ratings: ages,
        controls_pc: document.getElementById('controls-pc').value,
        controls_console: document.getElementById('controls-console').value,
        controls_mobile: document.getElementById('controls-mobile').value,
        controls_tv: document.getElementById('controls-tv').value,
        status: 'pending'
    };

    const submitBtn = document.getElementById('submit-btn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'Publicando...';

    try {
        const { data, error } = await window.sbClient
            .from('games')
            .insert([gameData]);

        if (error) {
            alert('Error al publicar: ' + error.message);
        } else {
            alert('¡Juego publicado con éxito! Pendiente de revisión.');
            window.location.href = 'cuenta.html';
        }
    } catch (err) {
        console.error(err);
        alert('Error inesperado.');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Publicar Juego';
    }
}