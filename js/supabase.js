const BRIDGE_ORIGIN = 'https://carleystudio.com';
let bridgeIframe = null;
const pendingRequests = new Map();

/**
 * Ensures the SSO bridge iframe exists.
 */
function ensureBridge() {
    if (bridgeIframe) return bridgeIframe;

    bridgeIframe = document.getElementById('sso-bridge');
    if (!bridgeIframe) {
        bridgeIframe = document.createElement('iframe');
        bridgeIframe.id = 'sso-bridge';
        bridgeIframe.src = `${BRIDGE_ORIGIN}/bridge.html`;
        bridgeIframe.style.display = 'none';
        document.body.appendChild(bridgeIframe);
    }
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
        }, 10000);

        pendingRequests.set(requestId, { resolve, reject, timeout });

        bridgeIframe.contentWindow.postMessage({
            type,
            payload,
            requestId
        }, BRIDGE_ORIGIN);
    });
}

// Listen for messages from the bridge
window.addEventListener('message', (event) => {
    if (event.origin !== BRIDGE_ORIGIN) return;

    const { type, requestId, payload, error } = event.data;
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
        // We don't necessarily need to store it locally if we use the bridge,
        // but we might want to refresh the bridge or something.
        // For now, just clean the URL.
        history.replaceState(null, null, window.location.pathname + window.location.search);
        // Refresh session state
        getSession().then(session => {
            if (session && window.checkUserAuth) window.checkUserAuth();
        });
    }
}

window.addEventListener('load', handleSSOCallback);

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
        const result = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved', ...filter }
        });
        return result || [];
    } catch (error) {
        console.error('Error fetching approved games:', error);
        return [];
    }
}

/**
 * Fetches categories from the server
 */
async function getCategories() {
    try {
        const result = await bridgeCall('SUPABASE_CALL', {
            table: 'categories',
            method: 'select',
            query: 'name'
        });
        return (result || []).map(c => c.name).sort();
    } catch (error) {
        return [];
    }
}

/**
 * Fetches games for a specific user, including pending ones.
 */
async function getUserGames(userId) {
    try {
        const result = await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { user_id: userId }
        });
        return result || [];
    } catch (error) {
        console.error('Error fetching user games:', error);
        return [];
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

    return await bridgeCall('SUPABASE_CALL', {
        table: 'games',
        method: 'insert',
        payload: [payload]
    });
}

// Auth Wrappers
async function signIn() {
    const domain = "creativegame.online";
    const redirectTo = window.location.href;
    window.location.href = `${BRIDGE_ORIGIN}/sso.html?domain=${domain}&redirect_to=${encodeURIComponent(redirectTo)}`;
}

async function signUp() {
    // Both sign in and sign up use the same SSO page usually, or we can just redirect to the same
    signIn();
}

async function signOut() {
    // We might need a bridge call for sign out or redirect to carleystudio.com/logout
    // For now, let's assume we redirect to a logout page or just clear local state if any
    window.location.href = `${BRIDGE_ORIGIN}/cuenta.html`; // Directing to central account page to logout
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
    if (!user) return [];

    try {
        const result = await bridgeCall('SUPABASE_CALL', {
            table: 'favorites',
            method: 'select',
            query: 'game_id',
            filter: { user_id: user.id }
        });
        return (result || []).map(f => f.game_id);
    } catch (e) {
        return [];
    }
}

async function toggleFavorite(gameId) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para favoritos');

    const existing = await bridgeCall('SUPABASE_CALL', {
        table: 'favorites',
        method: 'select',
        query: '*',
        filter: { user_id: user.id, game_id: gameId },
        single: true
    });

    if (existing) {
        return await bridgeCall('SUPABASE_CALL', {
            table: 'favorites',
            method: 'delete',
            filter: { id: existing.id }
        });
    } else {
        return await bridgeCall('SUPABASE_CALL', {
            table: 'favorites',
            method: 'insert',
            payload: [{ user_id: user.id, game_id: gameId }]
        });
    }
}

async function updateProfileMetadata(metadata) {
    const user = await getSessionUser();
    if (!user) throw new Error('No autenticado');

    // Update profiles table instead of auth.updateUser metadata directly via bridge
    return await bridgeCall('SUPABASE_CALL', {
        table: 'profiles',
        method: 'update',
        payload: metadata,
        filter: { id: user.id }
    });
}

/**
 * Star Ratings
 */
async function submitRating(gameId, score) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para calificar');

    return await bridgeCall('SUPABASE_CALL', {
        table: 'ratings',
        method: 'upsert',
        payload: {
            user_id: user.id,
            game_id: gameId,
            score: score
        }
    });
}

async function getUserRating(gameId) {
    const user = await getSessionUser();
    if (!user) return 0;

    const data = await bridgeCall('SUPABASE_CALL', {
        table: 'ratings',
        method: 'select',
        query: 'score',
        filter: { user_id: user.id, game_id: gameId },
        single: true
    });

    return data ? data.score : 0;
}

/**
 * Achievements
 */
async function awardAchievement(gameId, title, type = 'play_time', definitionId = null) {
    const user = await getSessionUser();
    if (!user) return;

    const payload = {
        user_id: user.id,
        game_id: gameId,
        type: type
    };

    if (definitionId) payload.definition_id = definitionId;
    else payload.title = title;

    try {
        return await bridgeCall('SUPABASE_CALL', {
            table: 'achievements',
            method: 'insert',
            payload: [payload]
        });
    } catch (error) {
        // Ignore unique constraint errors
        return null;
    }
}

async function unlockDeveloperAchievement(gameId, key) {
    const def = await bridgeCall('SUPABASE_CALL', {
        table: 'achievement_definitions',
        method: 'select',
        query: '*',
        filter: { game_id: gameId, key: key },
        single: true
    });

    if (!def) return null;
    return await awardAchievement(gameId, def.title, 'developer', def.id);
}

async function getGameAuthorGames(authorId) {
    return await bridgeCall('SUPABASE_CALL', {
        table: 'games',
        method: 'select',
        query: '*',
        filter: { user_id: authorId, status: 'approved' },
        limit: 10
    });
}

/**
 * Comments & Social Helpers
 */
async function getComments(gameId) {
    return await bridgeCall('SUPABASE_CALL', {
        table: 'comments',
        method: 'select',
        query: `*, profiles ( username, full_name )`,
        filter: { game_id: gameId }
    });
}

async function postComment(gameId, content) {
    const user = await getSessionUser();
    if (!user) throw new Error('Inicia sesión para comentar');

    return await bridgeCall('SUPABASE_CALL', {
        table: 'comments',
        method: 'insert',
        payload: [{
            game_id: gameId,
            user_id: user.id,
            content: content
        }]
    });
}

async function toggleLike(gameId) {
    return await toggleFavorite(gameId);
}

async function reportError(gameId) {
    // Assuming bridge supports RPC
    return await bridgeCall('SUPABASE_RPC', {
        function: 'report_game_error',
        params: { game_id_param: gameId }
    });
}

/**
 * Analytics / Play Tracking
 */
async function startPlaySession(gameId, deviceType = 'web') {
    const user = await getSessionUser();
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
}

async function endPlaySession(sessionId, durationSeconds) {
    if (!sessionId) return;
    await bridgeCall('SUPABASE_CALL', {
        table: 'play_sessions',
        method: 'update',
        payload: { duration_seconds: durationSeconds },
        filter: { id: sessionId }
    });
}

async function getNotifications() {
    const user = await getSessionUser();
    if (!user) return [];

    return await bridgeCall('SUPABASE_CALL', {
        table: 'notifications',
        method: 'select',
        query: '*',
        filter: { user_id: user.id }
    });
}

async function markNotificationRead(id) {
    return await bridgeCall('SUPABASE_CALL', {
        table: 'notifications',
        method: 'update',
        payload: { is_read: true },
        filter: { id: id }
    });
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
    if (!user) return [];

    try {
        return await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved' },
            limit: 10
        });
    } catch (e) {
        return [];
    }
}

async function getGamesByDevice(device, limit = 6) {
    try {
        return await bridgeCall('SUPABASE_CALL', {
            table: 'games',
            method: 'select',
            query: `*, profiles ( username, full_name )`,
            filter: { status: 'approved', devices: [device] }, // Assuming bridge handles array contains in filter or I need to adjust
            limit: limit
        });
    } catch (e) {
        return [];
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
