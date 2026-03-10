-- SQL Setup for Creative Game (V3 - Enhanced Features)
-- Run this in your Supabase SQL Editor

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
    rating FLOAT DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    admin_notes TEXT
);

-- 2. Create the comments table
CREATE TABLE IF NOT EXISTS public.comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL CHECK (char_length(content) <= 300),
    likes INTEGER DEFAULT 0,
    is_positive BOOLEAN DEFAULT true
);

-- 3. Create the likes table (to prevent multiple likes per user/comment)
CREATE TABLE IF NOT EXISTS public.comment_likes (
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    PRIMARY KEY (comment_id, user_id)
);

-- 4. Enable Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- 5. Policies for Games
CREATE POLICY "Anyone can view approved games" ON public.games FOR SELECT USING (status = 'approved');
CREATE POLICY "Users can view their own games" ON public.games FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Authenticated users can submit games" ON public.games FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 6. Policies for Comments
CREATE POLICY "Anyone can view comments" ON public.comments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can post comments" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 7. Logic for max 500 comments per game (Trigger)
CREATE OR REPLACE FUNCTION check_max_comments()
RETURNS TRIGGER AS $$
BEGIN
    IF (SELECT count(*) FROM public.comments WHERE game_id = NEW.game_id) >= 500 THEN
        RAISE EXCEPTION 'Este juego ya ha alcanzado el máximo de 500 comentarios.';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_check_max_comments
BEFORE INSERT ON public.comments
FOR EACH ROW EXECUTE FUNCTION check_max_comments();

-- 8. Logic for game suspension after 5 errors (Function)
CREATE OR REPLACE FUNCTION report_game_error(game_id UUID, error_info TEXT)
RETURNS void AS $$
DECLARE
    current_errors INTEGER;
    game_owner_id UUID;
BEGIN
    -- Increment error count
    UPDATE public.games
    SET error_count = error_count + 1
    WHERE id = game_id
    RETURNING error_count, user_id INTO current_errors, game_owner_id;

    -- Suspend if error_count >= 5
    IF current_errors >= 5 THEN
        UPDATE public.games
        SET status = 'suspended', admin_notes = 'Juego suspendido por fallos recurrentes (5+ reportes).'
        WHERE id = game_id;

        -- Note: In a real app, you would use an Edge Function or Database Hook to send an email here.
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
