-- Remover TODAS as políticas existentes do school_banners
DROP POLICY IF EXISTS "Admins can manage school banners" ON public.school_banners;
DROP POLICY IF EXISTS "Authenticated can view global banners" ON public.school_banners;
DROP POLICY IF EXISTS "Gestors can view their school banners" ON public.school_banners;
DROP POLICY IF EXISTS "Select global or user's school banners" ON public.school_banners;
DROP POLICY IF EXISTS "Allow banner insert for gestores and admins" ON public.school_banners;
DROP POLICY IF EXISTS "Update global banners by admins" ON public.school_banners;
DROP POLICY IF EXISTS "Update school banners by same school gestores/admins" ON public.school_banners;
DROP POLICY IF EXISTS "Delete global banners by admins" ON public.school_banners;
DROP POLICY IF EXISTS "Delete school banners by same school gestores/admins" ON public.school_banners;

-- Criar políticas mais simples e permissivas
-- Permitir leitura para todos os usuários autenticados
CREATE POLICY "Anyone can read banners"
ON public.school_banners
FOR SELECT
TO authenticated
USING (true);

-- Permitir inserção para admins e gestores
CREATE POLICY "Admins and gestors can insert banners"
ON public.school_banners
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gestor')
  )
);

-- Permitir atualização para admins e gestores
CREATE POLICY "Admins and gestors can update banners"
ON public.school_banners
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gestor')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gestor')
  )
);

-- Permitir exclusão para admins e gestores
CREATE POLICY "Admins and gestors can delete banners"
ON public.school_banners
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'gestor')
  )
);