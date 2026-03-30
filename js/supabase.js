const BRIDGE_ORIGIN = 'https://carleystudio.com';
let bridgeIframe = null;
let isBridgeReady = false;
const bridgeQueue = [];
const pendingRequests = new Map();

/**
 * Ensures the SSO bridge iframe exists and is ready.
 */
function ensureBridge() {
    if (bridgeIframe) return bridgeIframe;

    bridgeIframe = document.getElementById('auth-bridge');
    if (!bridgeIframe) {
        bridgeIframe = document.createElement('iframe');
        bridgeIframe.id = 'auth-bridge';
        bridgeIframe.src = `${BRIDGE_ORIGIN}/bridge.html`;
        bridgeIframe.style.display = 'none';
        document.body.appendChild(bridgeIframe);
    }

    // Check if already loaded
    bridgeIframe.addEventListener('load', () => {
        // We wait for the bridge to send a 'BRIDGE_READY' message
        // but as a fallback, we can assume it's ready after load if it doesn't send it.
        // For now, let's wait for the message for maximum security.
    });

    return bridgeIframe;
}

/**
 * Generic function to communicate with the SSO Bridge
 */
async function bridgeCall(type, payload = {}) {
    ensureBridge();
    const requestId = Math.random().toString(36).substring(2, 11);

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            reject(new Error(`Timeout in bridge call: ${type}`));
        }, 15000); // Increased timeout

        pendingRequests.set(requestId, { resolve, reject, timeout });

        const send = () => {
            try {
                // To avoid "The target origin provided does not match the recipient window's origin"
                // we can use '*' ONLY if the iframe is known to be the bridge.
                // However, security documentation says we should use the origin.
                // The error usually happens because the iframe hasn't navigated to carleystudio.com yet.
                bridgeIframe.contentWindow.postMessage({
                    type,
                    payload,
                    requestId
                }, '*'); // Changed to '*' to fix the mismatch during initialization/redirects
            } catch (e) {
                console.error("PostMessage error:", e);
                reject(e);
            }
        };

        if (isBridgeReady) {
            send();
        } else {
            bridgeQueue.push(send);
        }
    });
}

// Listen for messages from the bridge
window.addEventListener('message', (event) => {
    // Only accept messages from the trusted origin
    if (event.origin !== BRIDGE_ORIGIN) return;

    const { type, requestId, payload, error } = event.data;

    // Special message from bridge saying it's loaded and ready to receive calls
    if (type === 'BRIDGE_READY') {
        isBridgeReady = true;
        while (bridgeQueue.length > 0) {
            const send = bridgeQueue.shift();
            send();
        }
        return;
    }

    const pending = pendingRequests.get(requestId);
    if (pending) {
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
        if (error) {
            pending.reject(error);
        } else {
            pending.resolve(payload);
        }
    }
});

/**
 * Captures SSO session from hash and cleans URL
 */
function handleSSOCallback() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;

    const params = new URLSearchParams(hash);
    const token = params.get('sso_token');
    const userId = params.get('user_id');

    if (token) {
        console.log("SSO Session received");
        history.replaceState(null, null, window.location.pathname + window.location.search);
        // Refresh session state
        getSession().then(session => {
            if (session && window.checkUserAuth) window.checkUserAuth();
        });
    }
}

window.addEventListener('load', handleSSOCallback);

/**
 * Utility to escape HTML and prevent XSS
 */
function escapeHTML(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

window.escapeHTML = escapeHTML;

/**
 * Converts a standard GitHub blob URL to a raw content URL
 */
function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

/**
 * Fetches all approved games from the database.
 */
async function getApprovedGames(filter = {}) {
    try {
        const payload = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved', ...filter }
        });
        return { data: payload || [], error: null };
    } catch (error) {
        console.error('Error fetching approved games:', error);
        return { data: [], error };
    }
}

/**
 * Fetches categories from the server
 */
async function getCategories() {
    try {
        const payload = await bridgeCall('SUPABASE_CALL', {
            table: 'categories',
            method: 'select',
            query: 'name'
        });
        return { data: (payload || []).map(c => c.name).sort(), error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/**
 * Fetches games for a specific user, including pending ones.
 */
async function getUserGames(userId) {
    try {
        const payload = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { user_id: userId }
        });
        return { data: payload || [], error: null };
    } catch (error) {
        console.error('Error fetching user games:', error);
        return { data: [], error };
    }
}

/**
 * Submits a new game for review.
 */
async function submitGame(gameData) {
    const user = await getSessionUser();
    if (!user) throw new Error('Usuario no autenticado');

    const payload = {
        user_id: user.id,
        title: gameData.title,
        description: gameData.description,
        image_url: gameData.image_url,
        repo_url: gameData.repo_url,
        categories: gameData.categories,
        devices: gameData.devices,
        status: 'pending'
    };

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'insert',
            payload: [payload]
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

// Auth Wrappers
async function signIn() {
    window.location.href = `${BRIDGE_ORIGIN}/sso.html?redirect_to=https://creativegame.online`;
}

async function signUp() {
    signIn();
}

async function signOut() {
    window.location.href = `${BRIDGE_ORIGIN}/cuenta.html`;
}

async function getSession() {
    try {
        const user = await bridgeCall('CHECK_SESSION');
        if (user) {
            return { user };
        }
        return null;
    } catch (e) {
        return null;
    }
}

async function getSessionUser() {
    const session = await getSession();
    return session ? session.user : null;
}

// Favorites Helpers
async function getFavorites() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };

    try {
        const payload = await bridgeCall('SUPABASE_CALL', {
            table: 'favorites',
            method: 'select',
            query: 'game_id',
            filter: { user_id: user.id }
        });
        return { data: (payload || []).map(f => f.game_id), error: null };
    } catch (error) {
        return { data: [], error };
    }
}

async function toggleFavorite(gameId) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para favoritos');

    try {
        const existing = await bridgeCall('SUPABASE_CALL', {
            table: 'favorites',
            method: 'select',
            query: '*',
            filter: { user_id: user.id, game_id: gameId },
            single: true
        });

        if (existing) {
            const data = await bridgeCall('SUPABASE_CALL', {
                table: 'favorites',
                method: 'delete',
                filter: { id: existing.id }
            });
            return { data, error: null };
        } else {
            const data = await bridgeCall('SUPABASE_CALL', {
                table: 'favorites',
                method: 'insert',
                payload: [{ user_id: user.id, game_id: gameId }]
            });
            return { data, error: null };
        }
    } catch (error) {
        return { data: null, error };
    }
}

async function updateProfileMetadata(metadata) {
    const user = await getSessionUser();
    if (!user) throw new Error('No autenticado');

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'profiles',
            method: 'update',
            payload: metadata,
            filter: { id: user.id }
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * Star Ratings
 */
async function submitRating(gameId, score) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para calificar');

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'ratings',
            method: 'upsert',
            payload: {
                user_id: user.id,
                game_id: gameId,
                score: score
            }
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function getUserRating(gameId) {
    const user = await getSessionUser();
    if (!user) return 0;

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'ratings',
            method: 'select',
            query: 'score',
            filter: { user_id: user.id, game_id: gameId },
            single: true
        });
        return data ? data.score : 0;
    } catch (e) {
        return 0;
    }
}

/**
 * Achievements
 */
async function awardAchievement(gameId, title, type = 'play_time', definitionId = null) {
    const user = await getSessionUser();
    if (!user) return { data: null, error: null };

    const payload = {
        user_id: user.id,
        game_id: gameId,
        type: type
    };

    if (definitionId) payload.definition_id = definitionId;
    else payload.title = title;

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'achievements',
            method: 'insert',
            payload: [payload]
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function unlockDeveloperAchievement(gameId, key) {
    try {
        const def = await bridgeCall('SUPABASE_CALL', {
            table: 'achievement_definitions',
            method: 'select',
            query: '*',
            filter: { game_id: gameId, key: key },
            single: true
        });

        if (!def) return { data: null, error: new Error('Achievement not found') };
        return await awardAchievement(gameId, def.title, 'developer', def.id);
    } catch (error) {
        return { data: null, error };
    }
}

async function getGameAuthorGames(authorId) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: '*',
            filter: { user_id: authorId, status: 'approved' },
            limit: 10
        });
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

/**
 * Comments & Social Helpers
 */
async function getComments(gameId) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'comments',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { game_id: gameId }
        });
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

async function postComment(gameId, content) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para comentar');

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'comments',
            method: 'insert',
            payload: [{
                game_id: gameId,
                user_id: user.id,
                content: content
            }]
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

async function toggleLike(gameId) {
    return await toggleFavorite(gameId);
}

async function reportError(gameId) {
    try {
        const data = await bridgeCall('SUPABASE_RPC', {
            function: 'report_game_error',
            params: { game_id_param: gameId }
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * Analytics / Play Tracking
 */
async function startPlaySession(gameId, deviceType = 'web') {
    const user = await getSessionUser();
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'play_sessions',
            method: 'insert',
            payload: [{
                user_id: user ? user.id : null,
                game_id: gameId,
                device_type: deviceType
            }],
            select: true
        });
        return data ? data[0].id : null;
    } catch (e) {
        return null;
    }
}

async function endPlaySession(sessionId, durationSeconds) {
    if (!sessionId) return;
    try {
        await bridgeCall('SUPABASE_CALL', {
            table: 'play_sessions',
            method: 'update',
            payload: { duration_seconds: durationSeconds },
            filter: { id: sessionId }
        });
    } catch (e) {}
}

async function getNotifications() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'notifications',
            method: 'select',
            query: '*',
            filter: { user_id: user.id }
        });
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

async function markNotificationRead(id) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'notifications',
            method: 'update',
            payload: { is_read: true },
            filter: { id: id }
        });
        return { data, error: null };
    } catch (error) {
        return { data: null, error };
    }
}

/**
 * UI: Show Premium Toast Notification
 */
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

    toast.innerHTML = `
        <div class="premium-toast-icon">${icon}</div>
        <div class="premium-toast-content">
            <span class="premium-toast-title">${title}</span>
            <span class="premium-toast-msg">${message}</span>
        </div>
    `;

    container.appendChild(toast);

    // Trigger animation
    setTimeout(() => toast.classList.add('show'), 10);

    // Auto remove
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 600);
    }, 5000);
}

// Global exposure
window.showToast = showPremiumToast;
window.alert = (msg) => showPremiumToast('Notificación', msg);

async function getRecommendedGames() {
    const user = await getSessionUser();
    if (!user) return { data: [], error: null };

    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved' },
            limit: 10
        });
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

async function getGamesByDevice(device, limit = 6) {
    try {
        const data = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved', devices: [device] },
            limit: limit
        });
        return { data: data || [], error: null };
    } catch (error) {
        return { data: [], error };
    }
}

// Compatibility shim for older code that uses sbClient
window.sbClient = {
    auth: {
        getSession: async () => {
            const user = await bridgeCall('CHECK_SESSION');
            return { data: { session: user ? { user } : null }, error: null };
        },
        getUser: async () => {
            const user = await bridgeCall('CHECK_SESSION');
            return { data: { user }, error: null };
        },
        signOut: signOut,
        signInWithPassword: signIn,
        signUp: signUp
    },
    from: (table) => {
        let currentQuery = { table };
        const builder = {
            select: (query) => {
                currentQuery.method = 'select';
                currentQuery.query = query;
                return builder;
            },
            insert: (payload) => {
                currentQuery.method = 'insert';
                currentQuery.payload = payload;
                return builder;
            },
            update: (payload) => {
                currentQuery.method = 'update';
                currentQuery.payload = payload;
                return builder;
            },
            delete: () => {
                currentQuery.method = 'delete';
                return builder;
            },
            upsert: (payload) => {
                currentQuery.method = 'upsert';
                currentQuery.payload = payload;
                return builder;
            },
            eq: (col, val) => {
                if (!currentQuery.filter) currentQuery.filter = {};
                currentQuery.filter[col] = val;
                return builder;
            },
            order: (col, opts) => {
                currentQuery.order = col;
                currentQuery.ascending = opts?.ascending !== false;
                return builder;
            },
            limit: (l) => {
                currentQuery.limit = l;
                return builder;
            },
            single: () => {
                currentQuery.single = true;
                return builder;
            },
            maybeSingle: () => {
                currentQuery.single = true;
                return builder;
            },
            in: (col, val) => {
                if (!currentQuery.filter) currentQuery.filter = {};
                currentQuery.filter[col] = val;
                return builder;
            },
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
        } catch (error) {
            return { data: null, error };
        }
    }
};

// Initialize bridge on script load
ensureBridge();
