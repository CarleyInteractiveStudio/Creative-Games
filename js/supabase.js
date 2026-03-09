const SUPABASE_URL = 'https://tladrluezsmmhjbhupgb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zb8TGeURLnafHWDffG9DMg_PtFO_kmv';

// Global Supabase initialization
const { createClient } = window.supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

window.sbClient = _supabase;

async function getGames() {
    const { data, error } = await _supabase
        .from('games')
        .select('*');

    if (error) {
        console.error('Error fetching games:', error);
        return [];
    }
    return data;
}

async function getUserGames(userId) {
    const { data, error } = await _supabase
        .from('games')
        .select('*')
        .eq('user_id', userId);

    if (error) {
        console.error('Error fetching user games:', error);
        return [];
    }
    return data;
}

// Auth Wrappers
async function signIn(email, password) {
    return await _supabase.auth.signInWithPassword({ email, password });
}

async function signUp(email, password, metadata) {
    return await _supabase.auth.signUp({
        email,
        password,
        options: { data: metadata }
    });
}

async function signOut() {
    return await _supabase.auth.signOut();
}

async function getSession() {
    const { data: { session } } = await _supabase.auth.getSession();
    return session;
}

// User Metadata Helpers
async function toggleFavorite(gameId) {
    const session = await getSession();
    if (!session) return;

    let favorites = session.user.user_metadata.favorites || [];
    if (favorites.includes(gameId)) {
        favorites = favorites.filter(id => id !== gameId);
    } else {
        favorites.push(gameId);
    }

    return await _supabase.auth.updateUser({
        data: { favorites: favorites }
    });
}

async function updateProfileMetadata(metadata) {
    return await _supabase.auth.updateUser({
        data: metadata
    });
}