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
    from: (table) => {
        return {
            select: (query, opts) => {
                let currentQuery = { table, method: 'select', query };
                if (opts?.count) currentQuery.count = opts.count;

                const exec = (q) => bridgeCall('SUPABASE_CALL', q);

                return {
                    eq: (col, val) => {
                        currentQuery.filter = { ...currentQuery.filter, [col]: val };
                        return {
                            single: () => exec({ ...currentQuery, single: true }),
                            order: (c, o) => exec({ ...currentQuery, order: c, ascending: o?.ascending }),
                            limit: (l) => exec({ ...currentQuery, limit: l })
                        };
                    },
                    order: (c, o) => {
                        currentQuery.order = c;
                        currentQuery.ascending = o?.ascending;
                        return {
                            limit: (l) => exec({ ...currentQuery, limit: l }),
                            then: (resolve) => exec(currentQuery).then(resolve)
                        };
                    },
                    limit: (l) => {
                        currentQuery.limit = l;
                        return { then: (resolve) => exec(currentQuery).then(resolve) };
                    },
                    then: (resolve) => exec(currentQuery).then(resolve)
                };
            },
            insert: (payload) => bridgeCall('SUPABASE_CALL', { table, method: 'insert', payload }),
            update: (payload) => ({
                eq: (col, val) => bridgeCall('SUPABASE_CALL', { table, method: 'update', payload, filter: { [col]: val } })
            }),
            delete: () => ({
                eq: (col, val) => bridgeCall('SUPABASE_CALL', { table, method: 'delete', filter: { [col]: val } })
            })
        }
    }
};

ensureBridge();
