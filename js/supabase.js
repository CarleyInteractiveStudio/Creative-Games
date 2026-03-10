const SUPABASE_URL = 'https://tladrluezsmmhjbhupgb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zb8TGeURLnafHWDffG9DMg_PtFO_kmv';

// Global Supabase initialization
const { createClient } = window.supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

window.sbClient = _supabase;
const supabase = _supabase; // For compatibility

/**
 * Fetches all approved games from the database.
 */
async function getApprovedGames() {
    const { data, error } = await _supabase
        .from('games')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching approved games:', error);
        return [];
    }
    return data;
}

/**
 * Fetches games for a specific user, including pending ones.
 */
async function getUserGames(userId) {
    const { data, error } = await _supabase
        .from('games')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching user games:', error);
        return [];
    }
    return data;
}

/**
 * Submits a new game for review.
 */
async function submitGame(gameData) {
    const session = await getSession();
    if (!session) throw new Error('Usuario no autenticado');

    const payload = {
        user_id: session.user.id,
        title: gameData.title,
        description: gameData.description,
        image_url: gameData.image_url,
        repo_url: gameData.repo_url,
        categories: gameData.categories, // Array of strings
        devices: gameData.devices,       // Array of strings
        status: 'pending'
    };

    const { data, error } = await _supabase
        .from('games')
        .insert([payload])
        .select();

    if (error) throw error;
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

/**
 * Comments & Social Helpers
 */
async function getComments(gameId) {
    const { data, error } = await _supabase
        .from('comments')
        .select(`
            *,
            profiles ( username )
        `)
        .eq('game_id', gameId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
}

async function postComment(gameId, content) {
    const session = await getSession();
    if (!session) throw new Error('Inicia sesión para comentar');

    const { data, error } = await _supabase
        .from('comments')
        .insert([{
            game_id: gameId,
            user_id: session.user.id,
            content: content
        }]);

    if (error) throw error;
    return data;
}

async function toggleLike(gameId) {
    const session = await getSession();
    if (!session) throw new Error('Inicia sesión para dar me gusta');

    const userId = session.user.id;

    // Check if exists
    const { data: existing } = await _supabase
        .from('likes')
        .select('*')
        .eq('game_id', gameId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        return await _supabase.from('likes').delete().eq('id', existing.id);
    } else {
        return await _supabase.from('likes').insert([{ game_id: gameId, user_id: userId }]);
    }
}

async function reportError(gameId) {
    const { error } = await _supabase.rpc('report_game_error', { game_id_param: gameId });
    if (error) throw error;
    return true;
}