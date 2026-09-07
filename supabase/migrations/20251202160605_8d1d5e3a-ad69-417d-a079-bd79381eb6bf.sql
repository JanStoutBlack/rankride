-- Create role enum for users
CREATE TYPE public.user_role AS ENUM ('customer', 'driver', 'owner');

-- Create trip status enum
CREATE TYPE public.trip_status AS ENUM ('pending', 'assigned', 'in_progress', 'completed', 'cancelled');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'customer',
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ranks table (taxi ranks/stations)
CREATE TABLE public.ranks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create vehicles table
CREATE TABLE public.vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plate TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL DEFAULT 4,
  rank_id UUID REFERENCES public.ranks(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trips table
CREATE TABLE public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
  origin_rank_id UUID REFERENCES public.ranks(id),
  destination TEXT,
  fare DECIMAL(10, 2),
  status trip_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- RLS Policies for ranks (public read, owners can manage)
CREATE POLICY "Anyone can view ranks"
  ON public.ranks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Owners can manage ranks"
  ON public.ranks FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

-- RLS Policies for vehicles
CREATE POLICY "Anyone can view vehicles"
  ON public.vehicles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Drivers can update their own vehicle"
  ON public.vehicles FOR UPDATE
  TO authenticated
  USING (driver_id = auth.uid());

CREATE POLICY "Owners can manage vehicles"
  ON public.vehicles FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

-- RLS Policies for trips
CREATE POLICY "Customers can view their own trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid());

CREATE POLICY "Drivers can view assigned trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE driver_id = auth.uid()
    )
  );

CREATE POLICY "Customers can create trips"
  ON public.trips FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Drivers can update trip status"
  ON public.trips FOR UPDATE
  TO authenticated
  USING (
    vehicle_id IN (
      SELECT id FROM public.vehicles WHERE driver_id = auth.uid()
    )
  );

CREATE POLICY "Owners can view all trips"
  ON public.trips FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'owner'
    )
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::user_role, 'customer'),
    NEW.raw_user_meta_data ->> 'full_name'
  );
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_vehicles_updated_at
  BEFORE UPDATE ON public.vehicles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();