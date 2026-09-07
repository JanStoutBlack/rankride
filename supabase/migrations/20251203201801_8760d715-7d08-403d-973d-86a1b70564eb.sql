-- Create app_role enum for secure role management
CREATE TYPE public.app_role AS ENUM ('customer', 'driver', 'owner');

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Users can view their own roles
CREATE POLICY "Users can view own roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Security definer function to check roles (bypasses RLS safely)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create fares table for fare calculation
CREATE TABLE public.fares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origin_rank_id UUID REFERENCES public.ranks(id) ON DELETE CASCADE NOT NULL,
  destination TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (origin_rank_id, destination)
);

-- Enable RLS on fares
ALTER TABLE public.fares ENABLE ROW LEVEL SECURITY;

-- Anyone can view fares
CREATE POLICY "Anyone can view fares" ON public.fares
  FOR SELECT USING (true);

-- Owners can manage fares
CREATE POLICY "Owners can manage fares" ON public.fares
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Add vehicle tracking fields
ALTER TABLE public.vehicles 
ADD COLUMN IF NOT EXISTS current_destination TEXT,
ADD COLUMN IF NOT EXISTS available_seats INTEGER DEFAULT 4,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Create maintenance_logs table
CREATE TABLE public.maintenance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE NOT NULL,
  reported_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on maintenance_logs
ALTER TABLE public.maintenance_logs ENABLE ROW LEVEL SECURITY;

-- Owners can manage all maintenance logs
CREATE POLICY "Owners can manage maintenance" ON public.maintenance_logs
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Drivers can view maintenance for their vehicles
CREATE POLICY "Drivers can view own vehicle maintenance" ON public.maintenance_logs
  FOR SELECT TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE driver_id = auth.uid()
    )
  );

-- Drivers can create maintenance reports
CREATE POLICY "Drivers can report maintenance" ON public.maintenance_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'driver') AND reported_by = auth.uid()
  );

-- Update handle_new_user to also create user_roles entry
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _role app_role;
  _legacy_role user_role;
BEGIN
  -- Get role from metadata (only allow customer/owner for self-registration)
  _role := COALESCE(
    NULLIF(NEW.raw_user_meta_data ->> 'role', '')::app_role,
    'customer'::app_role
  );
  
  -- Prevent self-registration as driver
  IF _role = 'driver' THEN
    _role := 'customer';
  END IF;
  
  -- Map to legacy role for profiles table
  _legacy_role := _role::text::user_role;
  
  -- Insert profile
  INSERT INTO public.profiles (id, phone, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', ''),
    _legacy_role,
    NEW.raw_user_meta_data ->> 'full_name'
  );
  
  -- Insert into user_roles table
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, _role);
  
  RETURN NEW;
END;
$$;

-- Update RLS policies for ranks to use has_role
DROP POLICY IF EXISTS "Owners can manage ranks" ON public.ranks;
CREATE POLICY "Owners can manage ranks" ON public.ranks
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Update RLS policies for vehicles to use has_role
DROP POLICY IF EXISTS "Owners can manage vehicles" ON public.vehicles;
CREATE POLICY "Owners can manage vehicles" ON public.vehicles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Update RLS policies for trips to use has_role
DROP POLICY IF EXISTS "Owners can view all trips" ON public.trips;
CREATE POLICY "Owners can view all trips" ON public.trips
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Owners can update any trip
CREATE POLICY "Owners can update trips" ON public.trips
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'owner'));

-- Add trigger for maintenance_logs updated_at
CREATE TRIGGER update_maintenance_logs_updated_at
  BEFORE UPDATE ON public.maintenance_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();