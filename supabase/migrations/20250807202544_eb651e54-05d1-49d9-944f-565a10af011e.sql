-- Create a table for school customizations
CREATE TABLE public.school_customizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  school_name TEXT NOT NULL,
  theme_color TEXT DEFAULT '#3b82f6',
  logo_url TEXT,
  consultant_name TEXT,
  consultant_photo_url TEXT,
  zendesk_integration_url TEXT,
  metabase_integration_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES public.profiles(user_id)
);

-- Enable RLS on school_customizations
ALTER TABLE public.school_customizations ENABLE ROW LEVEL SECURITY;

-- RLS policies for school_customizations
CREATE POLICY "Admins can manage school customizations" 
ON public.school_customizations 
FOR ALL 
USING (is_admin())
WITH CHECK (is_admin());

CREATE POLICY "Gestors can view their school customizations" 
ON public.school_customizations 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'gestor'
  )
);

-- Add school_id to profiles to link gestors to schools
ALTER TABLE public.profiles ADD COLUMN school_id UUID REFERENCES public.school_customizations(id);

-- Create trigger for school_customizations updated_at
CREATE TRIGGER update_school_customizations_updated_at
BEFORE UPDATE ON public.school_customizations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();