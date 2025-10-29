-- Add INSERT policies for affiliations table
-- This allows users to create affiliations when scanning QR codes and admins to manage affiliations

-- Allow users to create their own affiliations (e.g., by scanning affiliation QR code)
CREATE POLICY "Users can create own affiliations"
ON public.affiliations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Allow admins to create affiliations for their clients
CREATE POLICY "Admins can create affiliations"
ON public.affiliations FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = admin_id AND public.has_role(auth.uid(), 'admin'));