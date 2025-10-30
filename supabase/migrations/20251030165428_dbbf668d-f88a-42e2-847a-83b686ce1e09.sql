-- 1. Crear tabla para códigos QR permanentes de admin
CREATE TABLE IF NOT EXISTS public.admin_qr_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(admin_id)
);

-- Enable RLS
ALTER TABLE public.admin_qr_codes ENABLE ROW LEVEL SECURITY;

-- RLS Policies para admin_qr_codes
CREATE POLICY "Admins can view own QR code"
  ON public.admin_qr_codes
  FOR SELECT
  USING (auth.uid() = admin_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert own QR code"
  ON public.admin_qr_codes
  FOR INSERT
  WITH CHECK (auth.uid() = admin_id AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read active admin QR codes for affiliation"
  ON public.admin_qr_codes
  FOR SELECT
  USING (true);

-- 2. Actualizar tabla admin_locations para incluir is_active
ALTER TABLE public.admin_locations 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- 3. Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_admin_locations_admin_id ON public.admin_locations(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_locations_is_active ON public.admin_locations(is_active);
CREATE INDEX IF NOT EXISTS idx_affiliations_admin_id ON public.affiliations(admin_id);
CREATE INDEX IF NOT EXISTS idx_affiliations_user_id ON public.affiliations(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles(user_id);

-- 4. Función para obtener la última ubicación activa del admin
CREATE OR REPLACE FUNCTION public.get_admin_active_location(admin_user_id UUID)
RETURNS TABLE (
  lat NUMERIC,
  lng NUMERIC,
  last_update TIMESTAMP WITH TIME ZONE,
  active BOOLEAN
)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT latitude, longitude, timestamp, is_active
  FROM public.admin_locations
  WHERE admin_id = admin_user_id
    AND is_active = true
  ORDER BY timestamp DESC
  LIMIT 1;
$$;

-- 5. Actualizar RLS policy de admin_locations para desactivar ubicaciones anteriores
CREATE POLICY "Admins can update own location active status"
  ON public.admin_locations
  FOR UPDATE
  USING (auth.uid() = admin_id AND has_role(auth.uid(), 'admin'));

-- 6. Política para permitir a admins ver sus clientes afiliados
DROP POLICY IF EXISTS "Admins can view their client affiliations" ON public.affiliations;
CREATE POLICY "Admins can view their client affiliations"
  ON public.affiliations
  FOR SELECT
  USING (auth.uid() = admin_id AND has_role(auth.uid(), 'admin'));

-- 7. Política para permitir ver perfiles de clientes afiliados
DROP POLICY IF EXISTS "Admins can view affiliated user profiles" ON public.profiles;
CREATE POLICY "Admins can view affiliated user profiles"
  ON public.profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.affiliations
      WHERE affiliations.user_id = profiles.id
        AND affiliations.admin_id = auth.uid()
        AND affiliations.is_active = true
        AND has_role(auth.uid(), 'admin')
    )
    OR auth.uid() = profiles.id
  );