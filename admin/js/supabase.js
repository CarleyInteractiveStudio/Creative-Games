const BRIDGE_ORIGIN = 'https://carleystudio.com';
let bridgeIframe = null;
const pendingRequests = new Map();

/**
 * Ensures the SSO bridge iframe exists.
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

function handleSSOCallback() {
    const hash = window.location.hash.substring(1);
    if (!hash) return;
    const params = new URLSearchParams(hash);
    const token = params.get('sso_token');
    if (token) {
        history.replaceState(null, null, window.location.pathname + window.location.search);
        if (window.checkAdminSession) window.checkAdminSession();
    }
}
window.addEventListener('load', handleSSOCallback);

function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

async function getSession() {
    try {
        const user = await bridgeCall('CHECK_SESSION');
        if (user) return { user };
        return null;
    } catch (e) {
        return null;
    }
}

async function signOut() {
    window.location.href = `${BRIDGE_ORIGIN}/cuenta.html`;
}

// Compatibility shim for Admin
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
        signInWithPassword: () => { window.location.href = `${BRIDGE_ORIGIN}/sso.html?redirect_to=https://creativegame.online`; },
        signUp: () => { window.location.href = `${BRIDGE_ORIGIN}/sso.html?redirect_to=https://creativegame.online`; }
    },
    from: (table) => {
        let currentQuery = { table };
        const builder = {
            select: (query, opts) => {
                currentQuery.method = 'select';
                currentQuery.query = query;
                if (opts?.count) currentQuery.count = opts.count;
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

ensureBridge();
