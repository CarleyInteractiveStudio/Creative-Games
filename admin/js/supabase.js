const BRIDGE_ORIGIN = 'https://carleystudio.com';
let bridgeIframe = null;
let isBridgeReady = false;
const bridgeQueue = [];
const pendingRequests = new Map();

// --- Immediate Token & UserID Capture ---
let ssoToken = localStorage.getItem('sso_token');
let userId = localStorage.getItem('user_id');

if (ssoToken === "null" || ssoToken === "undefined") ssoToken = null;
if (userId === "null" || userId === "undefined") userId = null;

try {
    const hash = window.location.hash.substring(1);
    if (hash) {
        const params = new URLSearchParams(hash);
        const token = params.get('sso_token');
        const uid = params.get('user_id');

        let cleaned = false;
        if (token && token !== "null" && token !== "undefined") {
            console.log("[SSO] Token captured from URL (Admin)");
            ssoToken = token;
            localStorage.setItem('sso_token', token);
            cleaned = true;
        }
        if (uid && uid !== "null" && uid !== "undefined") {
            console.log("[SSO] UserID captured from URL (Admin)");
            userId = uid;
            localStorage.setItem('user_id', uid);
            cleaned = true;
        }

        if (cleaned) {
            history.replaceState(null, null, window.location.pathname + window.location.search);
        }
    }
} catch (e) { console.error("[SSO] Error capturing data (Admin):", e); }

/**
 * Ensures the SSO bridge iframe exists and is ready.
 */
function ensureBridge() {
    if (bridgeIframe) return bridgeIframe;

    console.log("[Bridge] Initializing bridge (Admin)...");

    // Search for existing bridge to avoid duplicates
    bridgeIframe = document.getElementById('auth-bridge');

    if (!bridgeIframe) {
        console.log("[Bridge] Creating new bridge iframe (Admin)");
        bridgeIframe = document.createElement('iframe');
        bridgeIframe.id = 'auth-bridge';
        bridgeIframe.src = `${BRIDGE_ORIGIN}/bridge.html`;
        bridgeIframe.style.display = 'none';
        document.body.appendChild(bridgeIframe);
    } else {
        console.log("[Bridge] Using existing bridge iframe (Admin)");
    }

    // Safety timeout to consider bridge "ready" if signal never arrives
    setTimeout(() => {
        if (!isBridgeReady) {
            console.warn("[Bridge] Safety timeout (5s) reached waiting for READY signal (Admin).");
            isBridgeReady = true;
            processQueue();
        }
    }, 5000);

    return bridgeIframe;
}

function processQueue() {
    if (isBridgeReady && bridgeQueue.length > 0) {
        console.log(`[Bridge] Processing ${bridgeQueue.length} queued messages (Admin)`);
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

    // Ensure we have the latest token/UID from localStorage if available
    const currentToken = localStorage.getItem('sso_token');
    const currentUID = localStorage.getItem('user_id');

    const message = {
        type,
        payload,
        requestId,
        sso_token: currentToken || ssoToken
    };
    if (currentUID || userId) message.user_id = currentUID || userId;

    return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
            pendingRequests.delete(requestId);
            console.error(`[Bridge] Call Timeout: ${type} (ID: ${requestId}) after 10s (Admin)`);

            if (pendingRequests.size >= 2) {
                console.warn("[Bridge] Multiple timeouts detected - forcing bridge reset (Admin)");
                isBridgeReady = false;
                if (bridgeIframe) bridgeIframe.remove();
                bridgeIframe = null;
            }

            reject(new Error(`Timeout: ${type}`));
        }, 10000);
        pendingRequests.set(requestId, { resolve, reject, timeout });
        const send = () => {
            try {
                if (bridgeIframe && bridgeIframe.contentWindow) {
                    console.log(`[Bridge] OUT -> ${type} (ID: ${requestId}) (Admin)`, message);
                    bridgeIframe.contentWindow.postMessage(message, BRIDGE_ORIGIN);
                } else { throw new Error("Iframe error"); }
            } catch (e) {
                pendingRequests.delete(requestId);
                clearTimeout(timeout);
                reject(e);
            }
        };
        if (isBridgeReady) send(); else bridgeQueue.push(send);
    });
}

// Listen for messages from the bridge
window.addEventListener('message', (event) => {
    if (!event.origin.startsWith(BRIDGE_ORIGIN)) return;
    const { type, requestId, payload, error } = event.data;

    if (type === 'BRIDGE_READY') {
        console.log("[Bridge] READY signal received (Admin)");
        isBridgeReady = true;
        processQueue();
        return;
    }
    const pending = pendingRequests.get(requestId);
    if (pending) {
        console.log(`[Bridge] IN <- ${type} (ID: ${requestId}) (Admin)`, payload);
        clearTimeout(pending.timeout);
        pendingRequests.delete(requestId);
        if (error) {
            console.error(`[Bridge] Response Error (ID: ${requestId}) (Admin):`, error);
            pending.reject(error);
        } else {
            pending.resolve(payload);
        }
    }
});

function fixGitHubImageUrl(url) {
    if (!url) return url;
    if (url.includes('github.com') && url.includes('/blob/')) {
        return url.replace('github.com', 'raw.githubusercontent.com').replace('/blob/', '/');
    }
    return url;
}

async function getSession() {
    try {
        const token = localStorage.getItem('sso_token');
        const uid = localStorage.getItem('user_id');

        if (token && !isBridgeReady) {
            let waits = 0;
            while (!isBridgeReady && waits < 80) {
                await new Promise(r => setTimeout(r, 100));
                waits++;
            }
        }

        if (token) {
            try {
                await bridgeCall('SET_SESSION', { sso_token: token });
            } catch (e) {}
        }

        console.log("[Auth] Checking session (Admin)...");
        const payload = await bridgeCall('CHECK_SESSION', { sso_token: token });

        let user = null;
        if (payload) {
            if (payload.user) user = payload.user;
            else if (payload.session && payload.session.user) user = payload.session.user;
            else if (payload.id && payload.email) user = payload;
        }

        if (!user && token && uid) {
            try {
                const profile = await bridgeCall('SUPABASE_CALL', {
                    table: 'profiles',
                    method: 'select',
                    query: '*',
                    filter: { id: uid },
                    single: true
                });
                if (profile) {
                    user = { id: uid, ...profile };
                }
            } catch (err) {}
        }

        if (user) console.log("[Auth] Session active for (Admin):", user.email || user.username);
        else console.log("[Auth] No active session found (Admin). Payload:", payload);
        return user ? { user } : null;
    } catch (e) {
        console.error("[Auth] Session check failed (Admin):", e.message);
        return null;
    }
}

async function signOut() {
    ssoToken = null;
    userId = null;
    localStorage.removeItem('sso_token');
    localStorage.removeItem('user_id');
    window.location.href = `${BRIDGE_ORIGIN}/cuenta.html`;
}

// --- Supabase Client Shim for Admin ---
window.sbClient = {
    auth: {
        getSession: async () => { const session = await getSession(); return { data: { session }, error: null }; },
        getUser: async () => { const session = await getSession(); return { data: { user: session ? session.user : null }, error: null }; },
        signOut: signOut,
        signInWithPassword: () => { window.location.href = `https://carleystudio.com/sso.html?redirect_to=${encodeURIComponent(window.location.href)}`; },
        signUp: () => { window.location.href = `https://carleystudio.com/sso.html?redirect_to=${encodeURIComponent(window.location.href)}`; }
    },
    from: (table) => {
        let currentQuery = { table };
        const builder = {
            select: (query, opts) => {
                if (!currentQuery.method || currentQuery.method === 'select') {
                    currentQuery.method = 'select';
                    currentQuery.query = query || '*';
                }
                if (opts?.count) currentQuery.count = opts.count;
                return builder;
            },
            insert: (payload) => { currentQuery.method = 'insert'; currentQuery.payload = payload; return builder; },
            update: (payload) => { currentQuery.method = 'update'; currentQuery.payload = payload; return builder; },
            delete: () => { currentQuery.method = 'delete'; return builder; },
            upsert: (payload) => { currentQuery.method = 'upsert'; currentQuery.payload = payload; return builder; },
            eq: (col, val) => { if (!currentQuery.filter) currentQuery.filter = {}; currentQuery.filter[col] = val; return builder; },
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
