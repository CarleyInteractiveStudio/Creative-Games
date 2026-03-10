-- MASTER SQL PARA CREATIVE GAME (V6 - FULL FEATURES)
-- Ejecuta este script para sincronizar base de datos, administración y funciones avanzadas

-- 0. TABLA DE PERFILES (Sincronizada con Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    gender TEXT DEFAULT 'Ambos',
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger para sincronizar nombres reales (John Carley)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username, avatar_url, gender)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Usuario'),
        COALESCE(NEW.raw_user_meta_data->>'username', 'User_' || substr(NEW.id::text, 1, 5)),
        NEW.raw_user_meta_data->>'avatar_url',
        COALESCE(NEW.raw_user_meta_data->>'gender', 'Ambos')
    ) ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        username = EXCLUDED.username;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. TABLA DE JUEGOS
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    repo_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')),
    categories TEXT[] DEFAULT '{}',
    devices TEXT[] DEFAULT '{}',
    suggested_gender TEXT DEFAULT 'Ambos',
    rating FLOAT DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    admin_notes TEXT,
    engine TEXT DEFAULT 'Otros',
    age_ratings TEXT[] DEFAULT '{}',
    controls_pc TEXT,
    controls_console TEXT,
    controls_mobile TEXT,
    controls_tv TEXT
);

-- Ensure V6 columns exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'last_updated') THEN
        ALTER TABLE public.games ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'engine') THEN
        ALTER TABLE public.games ADD COLUMN engine TEXT DEFAULT 'Otros';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'age_ratings') THEN
        ALTER TABLE public.games ADD COLUMN age_ratings TEXT[] DEFAULT '{}';
    END IF;
END $$;

ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read Approved Games" ON public.games;
DROP POLICY IF EXISTS "Users can insert their own games" ON public.games;
DROP POLICY IF EXISTS "Users can update their own games" ON public.games;
DROP POLICY IF EXISTS "Admins can view all games" ON public.games;
DROP POLICY IF EXISTS "Admins can update any game" ON public.games;

CREATE POLICY "Public Read Approved Games" ON public.games FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can insert their own games" ON public.games FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own games" ON public.games FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all games" ON public.games FOR SELECT USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');
CREATE POLICY "Admins can update any game" ON public.games FOR UPDATE USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- Trigger para last_updated
CREATE OR REPLACE FUNCTION set_last_updated_timestamp() RETURNS TRIGGER AS $$
BEGIN NEW.last_updated = timezone('utc'::text, now()); RETURN NEW; END; $$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_game_last_updated ON public.games;
CREATE TRIGGER trigger_game_last_updated BEFORE UPDATE ON public.games FOR EACH ROW WHEN (OLD.* IS DISTINCT FROM NEW.*) EXECUTE FUNCTION set_last_updated_timestamp();

-- 2. CALIFICACIONES (Estrellas)
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    score INTEGER CHECK (score >= 1 AND score <= 5) NOT NULL,
    UNIQUE(user_id, game_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view ratings" ON public.ratings;
DROP POLICY IF EXISTS "Users can manage their own ratings" ON public.ratings;
CREATE POLICY "Public can view ratings" ON public.ratings FOR SELECT USING (true);
CREATE POLICY "Users can manage their own ratings" ON public.ratings FOR ALL USING (auth.uid() = user_id);

-- Función para promedio de estrellas
CREATE OR REPLACE FUNCTION update_game_average_rating()
RETURNS TRIGGER AS $$
DECLARE target_id UUID;
BEGIN
    target_id := COALESCE(NEW.game_id, OLD.game_id);
    UPDATE public.games SET rating = (SELECT COALESCE(AVG(score), 0) FROM public.ratings WHERE game_id = target_id) WHERE id = target_id;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_game_rating ON public.ratings;
CREATE TRIGGER trigger_update_game_rating AFTER INSERT OR UPDATE OR DELETE ON public.ratings FOR EACH ROW EXECUTE FUNCTION update_game_average_rating();

-- 3. NOTIFICACIONES
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can view all" ON public.notifications;
CREATE POLICY "Users can view own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all" ON public.notifications FOR SELECT USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- Trigger: Hitos de Me Gusta
CREATE OR REPLACE FUNCTION notify_like_milestone()
RETURNS TRIGGER AS $$
DECLARE owner_id UUID; game_title TEXT; like_count INTEGER;
BEGIN
    SELECT user_id, title INTO owner_id, game_title FROM public.games WHERE id = NEW.game_id;
    SELECT COUNT(*) INTO like_count FROM public.favorites WHERE game_id = NEW.game_id;
    IF like_count IN (10, 50, 100, 500, 1000, 5000) THEN
        INSERT INTO public.notifications (user_id, game_id, title, content, type)
        VALUES (owner_id, NEW.game_id, '¡Hito Alcanzado!', 'Tu juego "' || game_title || '" llegó a ' || like_count || ' me gusta.', 'milestone');
    END IF;
    RETURN NEW;
END; $$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_like_milestone ON public.favorites;
CREATE TRIGGER trigger_like_milestone AFTER INSERT ON public.favorites FOR EACH ROW EXECUTE FUNCTION notify_like_milestone();

-- 4. LOGROS
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, game_id, title)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users view own achievements" ON public.achievements;
CREATE POLICY "Users view own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);

-- 5. CATEGORÍAS
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public Read" ON public.categories;
DROP POLICY IF EXISTS "Admin All" ON public.categories;
CREATE POLICY "Public Read" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admin All" ON public.categories FOR ALL USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- 6. FAVORITOS
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users Own Favorites" ON public.favorites;
CREATE POLICY "Users Own Favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- 7. SESIONES DE JUEGO
CREATE TABLE IF NOT EXISTS public.play_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    device_type TEXT
);

ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can log play sessions" ON public.play_sessions;
DROP POLICY IF EXISTS "Users can see their own sessions" ON public.play_sessions;
CREATE POLICY "Anyone can log play sessions" ON public.play_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can see their own sessions" ON public.play_sessions FOR SELECT USING (auth.uid() = user_id);

-- 8. COMENTARIOS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view comments" ON public.comments;
DROP POLICY IF EXISTS "Users can post comments" ON public.comments;
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- REFRESCAR CACHÉ
NOTIFY pgrst, 'reload schema';
