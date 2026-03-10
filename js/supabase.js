const SUPABASE_URL = 'https://tladrluezsmmhjbhupgb.supabase.co';
const SUPABASE_KEY = 'sb_publishable_zb8TGeURLnafHWDffG9DMg_PtFO_kmv';

// Global Supabase initialization
const { createClient } = window.supabase;
const _supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

window.sbClient = _supabase;
const sb = _supabase; // Renamed to avoid SyntaxError with global 'supabase'

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

/**
 * Fetches all approved games from the database.
 */
async function getApprovedGames(filter = {}) {
    let query = _supabase
        .from('games')
        .select(`
            *,
            profiles ( username, full_name )
        `)
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
        .select(`
            *,
            profiles ( username, full_name )
        `)
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
 * Star Ratings
 */
async function submitRating(gameId, score) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) throw new Error('Inicia sesión para calificar');

    const { error } = await _supabase
        .from('ratings')
        .upsert({
            user_id: user.id,
            game_id: gameId,
            score: score
        }, { onConflict: 'user_id, game_id' });

    if (error) throw error;
}

async function getUserRating(gameId) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return 0;

    const { data, error } = await _supabase
        .from('ratings')
        .select('score')
        .eq('user_id', user.id)
        .eq('game_id', gameId)
        .maybeSingle();

    return data ? data.score : 0;
}

/**
 * Achievements
 */
async function awardAchievement(gameId, title, type = 'play_time', definitionId = null) {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return;

    const payload = {
        user_id: user.id,
        game_id: gameId,
        type: type
    };

    if (definitionId) payload.definition_id = definitionId;
    else payload.title = title;

    const { data, error } = await _supabase
        .from('achievements')
        .insert([payload])
        .select();

    if (error && error.code !== '23505') { // Ignore unique constraint errors
        console.error('Error awarding achievement:', error);
        return null;
    }

    if (error && error.code === '23505') return null; // Already unlocked

    return data ? data[0] : { title: title };
}

async function unlockDeveloperAchievement(gameId, key) {
    // 1. Find the definition
    const { data: def, error: defErr } = await _supabase
        .from('achievement_definitions')
        .select('*')
        .eq('game_id', gameId)
        .eq('key', key)
        .single();

    if (defErr || !def) {
        console.error('Achievement definition not found:', key);
        return null;
    }

    // 2. Award it
    return await awardAchievement(gameId, def.title, 'developer', def.id);
}

async function getGameAuthorGames(authorId) {
    const { data, error } = await _supabase
        .from('games')
        .select('*')
        .eq('user_id', authorId)
        .eq('status', 'approved')
        .limit(10);

    if (error) return [];
    return data;
}

/**
 * Comments & Social Helpers
 */
async function getComments(gameId) {
    const { data, error } = await _supabase
        .from('comments')
        .select(`
            *,
            profiles ( username, full_name )
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
    // Unificado con toggleFavorite para consistencia
    return await toggleFavorite(gameId);
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

async function getNotifications() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await _supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

    if (error) return [];
    return data;
}

async function markNotificationRead(id) {
    return await _supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
}

async function getRecommendedGames() {
    const { data: { user } } = await _supabase.auth.getUser();
    if (!user) return [];

    const userGender = user.user_metadata.gender || 'Ambos';

    // Fetch user interests
    const { data: profile } = await _supabase
        .from('profiles')
        .select('interests')
        .eq('id', user.id)
        .single();

    let keywords = [];
    if (profile && profile.interests) {
        // Extract keywords (longer than 3 chars)
        keywords = profile.interests.toLowerCase()
            .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g,"")
            .split(/\s+/)
            .filter(w => w.length > 3);
    }

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

    let query = _supabase
        .from('games')
        .select(`
            *,
            profiles ( username, full_name )
        `)
        .eq('status', 'approved');

    if (topCategory) {
        query = query.contains('categories', [topCategory]);
    }

    // If we have keywords from interests, try to match them in title or description
    if (keywords.length > 0) {
        const orConditions = keywords.map(w => `title.ilike.%${w}%,description.ilike.%${w}%`).join(',');
        query = query.or(orConditions);
    }

    // Filter by gender preference if not 'Ambos'
    if (userGender !== 'Ambos') {
        query = query.or(`suggested_gender.eq.${userGender},suggested_gender.eq.Ambos`);
    }

    const { data: recommended } = await query.limit(10);

    return recommended || [];
}