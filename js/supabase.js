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
async function getApprovedGames(filter = {}) {
    let query = _supabase
        .from('games')
        .select('*')
        .eq('status', 'approved');

    if (filter.device) {
        query = query.contains('devices', [filter.device]);
    }

    if (filter.category) {
        query = query.contains('categories', [filter.category]);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching approved games:', error);
        return [];
    }
    return data;
}

/**
 * Fetches categories from the server
 */
async function getCategories() {
    const { data, error } = await _supabase
        .from('categories')
        .select('name')
        .order('name');

    if (error) return [];
    return data.map(c => c.name);
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

// Favorites Helpers (Database-driven)
async function getFavorites() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
        .from('favorites')
        .select('game_id');

    if (error) return [];
    return data.map(f => f.game_id);
}

async function toggleFavorite(gameId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) throw new Error('Inicia sesión para favoritos');

    const { data: existing } = await _supabase
        .from('favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .single();

    if (existing) {
        return await _supabase.from('favorites').delete().eq('id', existing.id);
    } else {
        return await _supabase.from('favorites').insert([{ user_id: user.id, game_id: gameId }]);
    }
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

/**
 * Analytics / Play Tracking
 */
async function startPlaySession(gameId, deviceType = 'web') {
    const { data: { user } } = await _supabase.auth.getUser();
    const { data, error } = await _supabase
        .from('play_sessions')
        .insert([{
            user_id: user ? user.id : null,
            game_id: gameId,
            device_type: deviceType
        }])
        .select()
        .single();

    if (error) throw error;
    return data.id; // Session ID
}

async function endPlaySession(sessionId, durationSeconds) {
    await _supabase
        .from('play_sessions')
        .update({ duration_seconds: durationSeconds })
        .eq('id', sessionId);
}

async function getRecommendedGames() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    // Simple recommendation based on most played categories
    const { data: sessions } = await _supabase
        .from('play_sessions')
        .select('game_id, games(categories)')
        .eq('user_id', user.id)
        .limit(100);

    if (!sessions || sessions.length === 0) return [];

    const catCounts = {};
    sessions.forEach(s => {
        if (s.games && s.games.categories) {
            s.games.categories.forEach(c => {
                catCounts[c] = (catCounts[c] || 0) + 1;
            });
        }
    });

    const topCategory = Object.keys(catCounts).sort((a,b) => catCounts[b] - catCounts[a])[0];

    if (!topCategory) return [];

    const { data: recommended } = await _supabase
        .from('games')
        .select('*')
        .eq('status', 'approved')
        .contains('categories', [topCategory])
        .limit(6);

    return recommended || [];
}