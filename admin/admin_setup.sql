-- SQL for Admin Permissions (Run in Supabase Editor)
-- This ensures the admin user has bypass powers for management

-- 1. Create a way to identify admins (Optional but recommended)
-- For now, we allow the owner of the project to manage via RLS or specific policies

-- Enable admin to see all games
DROP POLICY IF EXISTS "Admins can view all games" ON public.games;
CREATE POLICY "Admins can view all games" ON public.games FOR SELECT USING (true);

-- Enable admin to update any game (Status, Notes)
DROP POLICY IF EXISTS "Admins can update any game" ON public.games;
CREATE POLICY "Admins can update any game" ON public.games FOR UPDATE USING (true);

-- Enable admin to manage categories
DROP POLICY IF EXISTS "Admins can manage categories" ON public.categories;
CREATE POLICY "Admins can manage categories" ON public.categories FOR ALL USING (true);

-- Enable admin to view all notifications
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications FOR SELECT USING (true);

-- Note: In a production environment, you should restrict these to specific user IDs or roles.
-- Example: USING (auth.jwt() ->> 'email' = 'tu-email@admin.com')
