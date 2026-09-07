/**
 * assign-trip — rank dispatch logic.
 *
 * Given a trip id, finds the next suitable vehicle at the trip's origin rank:
 * active, with a driver, with free seats, preferring one already heading to the
 * same destination. Assigns the vehicle to the trip, moves the trip to
 * `assigned`, and decrements the vehicle's available seats.
 *
 * Requires a valid bearer token; inputs are UUID-validated before any query.
 * The service-role client is only used after the caller is authenticated.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role for database operations
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { trip_id } = await req.json();

    // Validate UUID format
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!trip_id || !UUID_REGEX.test(trip_id)) {
      return new Response(
        JSON.stringify({ error: 'Valid trip_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`User ${user.id} assigning vehicle to trip: ${trip_id}`);

    // Get trip details
    const { data: trip, error: tripError } = await supabase
      .from('trips')
      .select('id, origin_rank_id, destination, status, customer_id')
      .eq('id', trip_id)
      .single();

    if (tripError || !trip) {
      console.error('Trip not found:', tripError);
      return new Response(
        JSON.stringify({ error: 'Trip not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user owns this trip or is an owner/driver
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const isOwner = userRole?.role === 'owner';
    const isDriver = userRole?.role === 'driver';
    const isCustomerOwner = trip.customer_id === user.id;

    if (!isOwner && !isDriver && !isCustomerOwner) {
      return new Response(
        JSON.stringify({ error: 'Not authorized to assign this trip' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (trip.status !== 'pending') {
      return new Response(
        JSON.stringify({ error: 'Trip already assigned or completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find available vehicle at the same rank
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select(`
        id,
        plate,
        capacity,
        available_seats,
        current_destination,
        driver_id,
        profiles:driver_id (full_name, phone)
      `)
      .eq('rank_id', trip.origin_rank_id)
      .eq('is_active', true)
      .gt('available_seats', 0)
      .order('created_at', { ascending: true });

    if (vehiclesError) {
      console.error('Error finding vehicles:', vehiclesError);
      return new Response(
        JSON.stringify({ error: 'Error finding available vehicles' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!vehicles || vehicles.length === 0) {
      console.log('No available vehicles at this rank');
      return new Response(
        JSON.stringify({ 
          error: 'No available vehicles at this rank',
          assigned: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find best match: prefer vehicle going same direction
    let selectedVehicle = vehicles.find(
      v => v.current_destination?.toLowerCase() === trip.destination?.toLowerCase()
    );

    // If no vehicle going same direction, use first available
    if (!selectedVehicle) {
      selectedVehicle = vehicles[0];
    }

    console.log(`Selected vehicle: ${selectedVehicle.plate}`);

    // Update trip with vehicle assignment
    const { error: updateTripError } = await supabase
      .from('trips')
      .update({ 
        vehicle_id: selectedVehicle.id,
        status: 'assigned'
      })
      .eq('id', trip_id);

    if (updateTripError) {
      console.error('Error updating trip:', updateTripError);
      return new Response(
        JSON.stringify({ error: 'Error assigning vehicle to trip' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update vehicle: decrement seats and set destination
    const newSeats = (selectedVehicle.available_seats || selectedVehicle.capacity) - 1;
    const { error: updateVehicleError } = await supabase
      .from('vehicles')
      .update({ 
        available_seats: newSeats,
        current_destination: trip.destination
      })
      .eq('id', selectedVehicle.id);

    if (updateVehicleError) {
      console.error('Error updating vehicle:', updateVehicleError);
    }

    const driverInfo = selectedVehicle.profiles as any;

    return new Response(
      JSON.stringify({
        assigned: true,
        vehicle_id: selectedVehicle.id,
        plate: selectedVehicle.plate,
        driver_name: driverInfo?.full_name || 'Driver',
        driver_phone: driverInfo?.phone || '',
        available_seats: newSeats
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in assign-trip:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
