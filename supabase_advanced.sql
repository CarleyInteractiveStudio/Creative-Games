-- SQL Setup for Advanced Game Features: Ratings, Achievements & Analytics
-- Run this in your Supabase SQL Editor

-- 1. Ratings Table
CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
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

-- 2. Function to update average game rating
CREATE OR REPLACE FUNCTION update_game_average_rating()
RETURNS TRIGGER AS $$
DECLARE
    target_id UUID;
BEGIN
    target_id := COALESCE(NEW.game_id, OLD.game_id);
    UPDATE public.games
    SET rating = (SELECT COALESCE(AVG(score), 0) FROM public.ratings WHERE game_id = target_id)
    WHERE id = target_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_update_game_rating ON public.ratings;
CREATE TRIGGER trigger_update_game_rating
AFTER INSERT OR UPDATE OR DELETE ON public.ratings
FOR EACH ROW EXECUTE FUNCTION update_game_average_rating();

-- 3. Achievements Table
CREATE TABLE IF NOT EXISTS public.achievements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL, -- 'play_time', 'special'
    icon TEXT,
    UNIQUE(user_id, game_id, title)
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own achievements" ON public.achievements;
CREATE POLICY "Users can view their own achievements" ON public.achievements FOR SELECT USING (auth.uid() = user_id);

-- 4. Update Games Table with Last Updated column if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'games' AND column_name = 'last_updated') THEN
        ALTER TABLE public.games ADD COLUMN last_updated TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());
    END IF;
END $$;

-- 5. Trigger to automatically set last_updated on changes
CREATE OR REPLACE FUNCTION set_last_updated_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_game_last_updated ON public.games;
CREATE TRIGGER trigger_game_last_updated
BEFORE UPDATE ON public.games
FOR EACH ROW
WHEN (OLD.* IS DISTINCT FROM NEW.*)
EXECUTE FUNCTION set_last_updated_timestamp();

-- 6. Notify PostgREST to reload schema cache
-- 6. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'milestone', 'error', 'status', 'info'
    is_read BOOLEAN DEFAULT false,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

-- 7. Trigger for Like Milestones
CREATE OR REPLACE FUNCTION notify_like_milestone()
RETURNS TRIGGER AS $$
DECLARE
    owner_id UUID;
    game_title TEXT;
    like_count INTEGER;
BEGIN
    SELECT user_id, title INTO owner_id, game_title FROM public.games WHERE id = NEW.game_id;
    SELECT COUNT(*) INTO like_count FROM public.favorites WHERE game_id = NEW.game_id;

    IF like_count IN (10, 50, 100, 500, 1000, 5000) THEN
        INSERT INTO public.notifications (user_id, game_id, title, content, type)
        VALUES (owner_id, NEW.game_id, '¡Hito Alcanzado!', 'Tu juego "' || game_title || '" ha alcanzado los ' || like_count || ' me gusta. ¡Felicidades!', 'milestone');
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_like_milestone ON public.favorites;
CREATE TRIGGER trigger_like_milestone
AFTER INSERT ON public.favorites
FOR EACH ROW EXECUTE FUNCTION notify_like_milestone();

-- 8. Trigger for Game Status Notifications
CREATE OR REPLACE FUNCTION notify_game_status_change()
RETURNS TRIGGER AS $$
DECLARE
    msg_title TEXT;
    msg_content TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        IF NEW.status = 'approved' THEN
            msg_title := 'Juego Aprobado';
            msg_content := '¡Buenas noticias! Tu juego "' || NEW.title || '" ha sido aprobado y ya es público.';
        ELSIF NEW.status = 'rejected' THEN
            msg_title := 'Juego Rechazado';
            msg_content := 'Tu juego "' || NEW.title || '" no ha sido aprobado. Revisa las políticas y actualízalo.';
        ELSIF NEW.status = 'suspended' THEN
            msg_title := 'Juego Suspendido';
            msg_content := 'Se han detectado fallos en tu juego "' || NEW.title || '" y ha sido suspendido.';
        END IF;

        IF msg_title IS NOT NULL THEN
            INSERT INTO public.notifications (user_id, game_id, title, content, type)
            VALUES (NEW.user_id, NEW.id, msg_title, msg_content, 'status');
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_game_status_notify ON public.games;
CREATE TRIGGER trigger_game_status_notify
AFTER UPDATE ON public.games
FOR EACH ROW EXECUTE FUNCTION notify_game_status_change();

-- 9. Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
