-- SQL for Admin Permissions (Secure Version)
-- Run this in your Supabase SQL Editor

-- REPLACE 'johncarley14@gmail.com' with your actual admin email if it changes
-- These policies use JWT email to grant permissions directly

-- 1. Enable admin to view all games (including pending/rejected)
DROP POLICY IF EXISTS "Admins can view all games" ON public.games;
CREATE POLICY "Admins can view all games" ON public.games
FOR SELECT
USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- 2. Enable admin to update any game (Status, Notes)
DROP POLICY IF EXISTS "Admins can update any game" ON public.games;
CREATE POLICY "Admins can update any game" ON public.games
FOR UPDATE
USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- 3. Enable admin to manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories
FOR ALL
USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- 4. Enable admin to view all notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications
FOR SELECT
USING (auth.jwt() ->> 'email' = 'johncarley14@gmail.com');

-- Keep public read policies intact so users can still see approved games
-- CREATE POLICY "Public Read Approved Games" ON public.games FOR SELECT USING (status = 'approved');
