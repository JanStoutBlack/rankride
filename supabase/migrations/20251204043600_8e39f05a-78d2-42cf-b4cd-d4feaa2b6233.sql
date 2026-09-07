-- Remove public access to vehicles table
DROP POLICY IF EXISTS "Anyone can view vehicles" ON public.vehicles;

-- Allow only authenticated users to view vehicles
CREATE POLICY "Authenticated users can view vehicles" 
ON public.vehicles
FOR SELECT 
TO authenticated
USING (true);