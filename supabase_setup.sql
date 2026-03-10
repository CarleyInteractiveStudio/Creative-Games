-- SQL Setup for Creative Game (V4 - Analytics, Favorites & Categories)
-- Run this in your Supabase SQL Editor

-- 0. Profiles table (Sync with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    gender TEXT DEFAULT 'Ambos',
    updated_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, username, avatar_url)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'username', NEW.raw_user_meta_data->>'avatar_url');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 1. Create the games table (Extended)
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
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
    admin_notes TEXT
);

-- 2. Create the categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    icon TEXT
);

-- Seed categories
INSERT INTO public.categories (name) VALUES
('Acción'), ('Aventura'), ('Disparos'), ('Simulación'), ('Estrategia'),
('Deportes'), ('Puzzle'), ('Arcade'), ('Terror'), ('RPG'),
('Carreras'), ('Cooperativo'), ('Multijugador'), ('Indie')
ON CONFLICT (name) DO NOTHING;

-- 3. Create the favorites table
CREATE TABLE IF NOT EXISTS public.favorites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, game_id)
);

-- 4. Create play sessions table for tracking
CREATE TABLE IF NOT EXISTS public.play_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    duration_seconds INTEGER DEFAULT 0,
    device_type TEXT
);

-- 5. Create the comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 300),
    likes INTEGER DEFAULT 0,
    is_positive BOOLEAN DEFAULT true
);

-- 6. Enable RLS
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.play_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies
CREATE POLICY "Public Read Categories" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Public Read Approved Games" ON public.games FOR SELECT USING (status = 'approved');
CREATE POLICY "Users Own Games" ON public.games FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users Own Favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can log play sessions" ON public.play_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Users can see their own sessions" ON public.play_sessions FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 8. Functions & Triggers

-- Increment play count on session start
CREATE OR REPLACE FUNCTION increment_game_play_count()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.games SET play_count = play_count + 1 WHERE id = NEW.game_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_play_count
AFTER INSERT ON public.play_sessions
FOR EACH ROW EXECUTE FUNCTION increment_game_play_count();

-- Report game error
CREATE OR REPLACE FUNCTION report_game_error(game_id_param UUID)
RETURNS void AS $$
DECLARE
    current_errors INTEGER;
BEGIN
    UPDATE public.games
    SET error_count = error_count + 1
    WHERE id = game_id_param
    RETURNING error_count INTO current_errors;

    IF current_errors >= 5 THEN
        UPDATE public.games SET status = 'suspended' WHERE id = game_id_param;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
