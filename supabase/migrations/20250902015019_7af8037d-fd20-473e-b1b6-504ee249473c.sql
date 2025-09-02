-- Fix security issue: Add missing RLS policies for usage_events table

-- Allow users to view their own usage events
CREATE POLICY "Users can view their own usage events" 
ON public.usage_events 
FOR SELECT 
USING (auth.uid() = user_id);

-- Allow admins to update usage events (for data management)
CREATE POLICY "Admins can update usage events" 
ON public.usage_events 
FOR UPDATE 
USING (is_admin());

-- Allow admins to delete usage events (for data management)
CREATE POLICY "Admins can delete usage events" 
ON public.usage_events 
FOR DELETE 
USING (is_admin());