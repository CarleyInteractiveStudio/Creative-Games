-- ACTUALIZACIÓN PARA LOGROS Y RECOMENDACIONES POR INTERESES

-- 1. Agregar intereses a perfiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS interests TEXT;

-- 2. Crear tabla de definiciones de logros
CREATE TABLE IF NOT EXISTS public.achievement_definitions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    game_id UUID REFERENCES public.games(id) ON DELETE CASCADE NOT NULL,
    key TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    icon_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(game_id, key)
);

-- Habilitar RLS para definiciones de logros
ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can view achievement definitions" ON public.achievement_definitions;
DROP POLICY IF EXISTS "Owners can manage achievement definitions" ON public.achievement_definitions;

CREATE POLICY "Anyone can view achievement definitions" ON public.achievement_definitions FOR SELECT USING (true);
CREATE POLICY "Owners can manage achievement definitions" ON public.achievement_definitions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.games WHERE id = game_id AND user_id = auth.uid())
);

-- 3. Actualizar tabla de logros obtenidos
ALTER TABLE public.achievements ADD COLUMN IF NOT EXISTS definition_id UUID REFERENCES public.achievement_definitions(id) ON DELETE CASCADE;
-- Permitir que el título sea opcional si hay una definición
ALTER TABLE public.achievements ALTER COLUMN title DROP NOT NULL;

-- 4. Notificar recarga de esquema
NOTIFY pgrst, 'reload schema';
