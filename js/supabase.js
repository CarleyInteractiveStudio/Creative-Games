const BRIDGE_ORIGIN = 'https://carleystudio.com';
let bridgeIframe = null;
let isBridgeReady = false;
const bridgeQueue = [];
const pendingRequests = new Map();

// --- Immediate Token & UserID Capture ---
let ssoToken = localStorage.getItem('sso_token');
let userId = localStorage.getItem('user_id');

try {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const params = new URLSearchParams(hash);
        const token = params.get('sso_token');
        const uid = params.get('user_id');

        let cleaned = false;
        if (token) {
            console.log("[SSO] Token captured from URL");
            ssoToken = token;
            localStorage.setItem('sso_token', token);
            cleaned = true;
        }
        if (uid) {
            console.log("[SSO] UserID captured from URL");
            userId = uid;
            localStorage.setItem('user_id', uid);
            cleaned = true;
        }

        if (cleaned) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }
} catch (e) { console.error("[SSO] Error capturing data:", e); }

/**
 * Ensures the SSO bridge iframe exists and is ready.
 */
function ensureBridge() {
    if (bridgeIframe) return bridgeIframe;

    // Search for existing bridge to avoid duplicates
    bridgeIframe = document.getElementById('auth-bridge');

    if (!bridgeIframe) {
        console.log("[Bridge] Creating new bridge iframe");
        bridgeIframe = document.createElement('iframe');
        bridgeIframe.id = 'auth-bridge';
        bridgeIframe.src = `${BRIDGE_ORIGIN}/bridge.html`;
        bridgeIframe.style.display = 'none';
        document.body.appendChild(bridgeIframe);
    } else {
        console.log("[Bridge] Using existing bridge iframe");
    }

    // Safety timeout to consider bridge "ready" if signal never arrives
    setTimeout(() => {
        if (!isBridgeReady) {
            console.warn("[Bridge] Timeout waiting for READY signal - forcing ready state for queue");
            isBridgeReady = true;
            processQueue();
        }
    }, 8000);

    return bridgeIframe;
}

function processQueue() {
    if (bridgeQueue.length > 0) {
        console.log(`[Bridge] Processing ${bridgeQueue.length} queued messages`);
        while (bridgeQueue.length > 0) {
            const send = bridgeQueue.shift();
            send();
        }
    }
}

/**
 * Generic function to communicate with the SSO Bridge
 */
async function bridgeCall(type, payload = {}) {
    ensureBridge();
    const requestId = Math.random().toString(36).substring(2, 11);

    // Construction of the message exactly as per documentation
    const message = {
        type,
        payload,
        requestId,
        sso_token: ssoToken, // Ensure token is present at top level
        user_id: userId
    };

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            console.error(`[Bridge] Timeout in bridge call: ${type} (Req: ${requestId})`);
            reject(new Error(`Timeout in bridge call: ${type}`));
        }, 10000);

        pendingRequests.set(requestId, { resolve, reject, timeout });

        const send = () => {
            try {
                if (bridgeIframe && bridgeIframe.contentWindow) {
                    bridgeIframe.contentWindow.postMessage(message, '*');
                } else {
                    throw new Error("Bridge iframe not accessible");
                }
            } catch (e) {
                console.error("[Bridge] PostMessage failure:", e);
                pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(e);
            }
        };

        if (isBridgeReady) send();
        else bridgeQueue.push(send);
    });
}

// Listen for messages from the bridge
window.addEventListener('message', (event) => {
    if (!event.origin.startsWith(BRIDGE_ORIGIN)) return;

    const { type, requestId, payload, error } = event.data;

    if (type === 'BRIDGE_READY') {
        console.log("[Bridge] READY signal received");
        isBridgeReady = true;
        processQueue();
        return;
    }

    const pending = pendingRequests.get(requestId);
    if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
        if (error) {
            console.error(`[Bridge] Error for request ${requestId}:`, error);
            pending.reject(error);
        } else {
            pending.resolve(payload);
        }
    }
});

/**
 * UI Utilities
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}
window.escapeHTML = escapeHTML;

function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

/**
 * Database Helpers
 */
async function getApprovedGames(filter = {}) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games', method: 'select', query: '*',
            filter: { status: 'approved', ...filter }
        });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function getCategories() {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'categories', method: 'select', query: 'name'
        });
        return { data: (data || []).map(c => c.name).sort(), error: null };
    } catch (error) { return { data: [], error }; }
}

async function getUserGames(userId) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games', method: 'select', query: '*', filter: { user_id: userId }
        });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function submitGame(gameData) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games', method: 'insert', payload: [gameData]
        });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

// --- Auth Wrappers ---
async function signIn() {
    window.location.href = `${BRIDGE_ORIGIN}/sso.html?redirect_to=${encodeURIComponent(window.location.href)}`;
}

async function signOut() {
    ssoToken = null;
    userId = null;
    localStorage.removeItem('sso_token');
    localStorage.removeItem('user_id');
    window.location.href = `${BRIDGE_ORIGIN}/cuenta.html`;
}

async function getSession() {
    try {
        const user = await bridgeCall('CHECK_SESSION');
        return user ? { user } : null;
    } catch (e) { return null; }
}

async function getSessionUser() {
    const session = await getSession();
    return session ? session.user : null;
}

// --- Generic Feature Helpers ---
async function getFavorites() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'favorites', method: 'select', query: 'game_id', filter: { user_id: user.id } });
        return { data: (data || []).map(f => f.game_id), error: null };
    } catch (error) { return { data: [], error }; }
}

async function toggleFavorite(gameId) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión');
    try {
        const existing = await bridgeCall('SUPABASE_CALL', { table: 'favorites', method: 'select', query: '*', filter: { user_id: user.id, game_id: gameId }, single: true });
        if (existing) {
            await bridgeCall('SUPABASE_CALL', { table: 'favorites', method: 'delete', filter: { id: existing.id } });
            return { data: true, error: null };
        } else {
            await bridgeCall('SUPABASE_CALL', { table: 'favorites', method: 'insert', payload: [{ user_id: user.id, game_id: gameId }] });
            return { data: true, error: null };
        }
    } catch (error) { return { data: null, error }; }
}

async function updateProfileMetadata(metadata) {
    const user = await getSessionUser();
    if (!user) throw new Error('No autenticado');
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'profiles', method: 'update', payload: metadata, filter: { id: user.id } });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

async function submitRating(gameId, score) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión');
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'ratings', method: 'upsert', payload: { user_id: user.id, game_id: gameId, score: score } });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

async function getUserRating(gameId) {
    const user = await getSessionUser();
    if (!user) return 0;
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'ratings', method: 'select', query: 'score', filter: { user_id: user.id, game_id: gameId }, single: true });
        return data ? data.score : 0;
    } catch (e) { return 0; }
}

async function awardAchievement(gameId, title, type = 'play_time', definitionId = null) {
    const user = await getSessionUser();
    if (!user) return { data: null, error: null };
    const payload = { user_id: user.id, game_id: gameId, type: type };
    if (definitionId) payload.definition_id = definitionId;
    else payload.title = title;
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'achievements', method: 'insert', payload: [payload] });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

async function unlockDeveloperAchievement(gameId, key) {
    try {
        const def = await bridgeCall('SUPABASE_CALL', { table: 'achievement_definitions', method: 'select', query: '*', filter: { game_id: gameId, key: key }, single: true });
        if (!def) return { data: null, error: new Error('Not found') };
        return await awardAchievement(gameId, def.title, 'developer', def.id);
    } catch (error) { return { data: null, error }; }
}

async function getGameAuthorGames(authorId) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'games', method: 'select', query: '*', filter: { user_id: authorId, status: 'approved' }, limit: 10 });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function getComments(gameId) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'comments', method: 'select', query: '*', filter: { game_id: gameId } });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function postComment(gameId, content) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión');
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'comments', method: 'insert', payload: [{ game_id: gameId, user_id: user.id, content: content }] });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

async function reportError(gameId) {
    try {
        const data = await bridgeCall('SUPABASE_RPC', { function: 'report_game_error', params: { game_id_param: gameId } });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

async function startPlaySession(gameId, deviceType = 'web') {
    const user = await getSessionUser();
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'play_sessions', method: 'insert', payload: [{ user_id: user ? user.id : null, game_id: gameId, device_type: deviceType }], select: true });
        return data ? data[0].id : null;
    } catch (e) { return null; }
}

async function endPlaySession(sessionId, durationSeconds) {
    if (!sessionId) return;
    try { await bridgeCall('SUPABASE_CALL', { table: 'play_sessions', method: 'update', payload: { duration_seconds: durationSeconds }, filter: { id: sessionId } }); } catch (e) {}
}

async function getNotifications() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'notifications', method: 'select', query: '*', filter: { user_id: user.id } });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function markNotificationRead(id) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'notifications', method: 'update', payload: { is_read: true }, filter: { id: id } });
        return { data, error: null };
    } catch (error) { return { data: null, error }; }
}

function showPremiumToast(title, message, type = 'info') {
    let container = document.getElementById('premium-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'premium-toast-container';
        container.className = 'premium-toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `premium-toast ${type === 'error' ? 'error' : ''}`;
    const icon = type === 'error' ? '⚠️' : '✨';
    toast.innerHTML = `<div class="premium-toast-icon">${icon}</div><div class="premium-toast-content"><span class="premium-toast-title">${title}</span><span class="premium-toast-msg">${message}</span></div>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 600); }, 5000);
}
window.showToast = showPremiumToast;
window.alert = (msg) => showPremiumToast('Notificación', msg);

async function getRecommendedGames() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'games', method: 'select', query: '*', filter: { status: 'approved' }, limit: 10 });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

async function getGamesByDevice(device, limit = 6) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', { table: 'games', method: 'select', query: '*', filter: { status: 'approved', devices: [device] }, limit: limit });
        return { data: data || [], error: null };
    } catch (error) { return { data: [], error }; }
}

// --- Standardized Supabase Client Shim ---
window.sbClient = {
    auth: {
        getSession: async () => { const session = await getSession(); return { data: { session }, error: null }; },
        getUser: async () => { const user = await getSessionUser(); return { data: { user }, error: null }; },
        signOut: signOut,
        signInWithPassword: signIn,
        signUp: signIn
    },
    from: (table) => {
        let currentQuery = { table };
        const builder = {
            select: (query) => {
                if (!currentQuery.method || currentQuery.method === 'select') {
                    currentQuery.method = 'select';
                    currentQuery.query = query || '*';
                }
                return builder;
            },
            insert: (payload) => { currentQuery.method = 'insert'; currentQuery.payload = payload; return builder; },
            update: (payload) => { currentQuery.method = 'update'; currentQuery.payload = payload; return builder; },
            delete: () => { currentQuery.method = 'delete'; return builder; },
            upsert: (payload) => { currentQuery.method = 'upsert'; currentQuery.payload = payload; return builder; },
            eq: (col, val) => { if (!currentQuery.filter) currentQuery.filter = {}; currentQuery.filter[col] = val; return builder; },
            in: (col, val) => { if (!currentQuery.filter) currentQuery.filter = {}; currentQuery.filter[col] = val; return builder; },
            order: (col, opts) => { currentQuery.order = col; currentQuery.ascending = opts?.ascending !== false; return builder; },
            limit: (l) => { currentQuery.limit = l; return builder; },
            single: () => { currentQuery.single = true; return builder; },
            maybeSingle: () => { currentQuery.single = true; return builder; },
            then: (resolve, reject) => {
                bridgeCall('SUPABASE_CALL', currentQuery)
                    .then(payload => resolve({ data: payload, error: null }))
                    .catch(err => resolve({ data: null, error: err }));
            }
        };
        return builder;
    },
    rpc: async (fn, params) => {
        try {
            const data = await bridgeCall('SUPABASE_RPC', { function: fn, params });
            return { data, error: null };
        } catch (error) { return { data: null, error }; }
    }
};

ensureBridge();
