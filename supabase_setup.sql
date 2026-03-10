-- SQL Setup for Creative Game
-- Run this in your Supabase SQL Editor

-- 1. Create the games table
CREATE TABLE IF NOT EXISTS public.games (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    repo_url TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    categories TEXT[] DEFAULT '{}',
    devices TEXT[] DEFAULT '{}',
    rating FLOAT DEFAULT 0,
    play_count INTEGER DEFAULT 0,
    admin_notes TEXT
);

-- 2. Enable Row Level Security (RLS)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- 3. Create Policies

-- Allow anyone to read approved games
CREATE POLICY "Anyone can view approved games"
ON public.games FOR SELECT
USING (status = 'approved');

-- Allow users to view their own games (regardless of status)
CREATE POLICY "Users can view their own games"
ON public.games FOR SELECT
USING (auth.uid() = user_id);

-- Allow authenticated users to insert games
CREATE POLICY "Authenticated users can submit games"
ON public.games FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to update their own pending games
CREATE POLICY "Users can update their own pending games"
ON public.games FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

-- 4. Set up storage for game images (optional but recommended)
-- insert into storage.buckets (id, name) values ('game-assets', 'game-assets');
-- create policy "Game assets are publicly accessible" on storage.objects for select using ( bucket_id = 'game-assets' );
-- create policy "Users can upload game assets" on storage.objects for insert with check ( bucket_id = 'game-assets' AND auth.role() = 'authenticated' );

-- 5. Helper function to update ratings (simplified)
CREATE OR REPLACE FUNCTION update_game_rating(game_id UUID, new_rating FLOAT)
RETURNS void AS $$
BEGIN
    UPDATE public.games
    SET rating = (rating + new_rating) / 2
    WHERE id = game_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
