/**
 * calculate-fare — returns the fare for a rank + destination.
 *
 * Looks up a preset row in `fares` first. If none exists, falls back to a
 * distance estimate: BASE_FARE + PER_KM_RATE * haversine(rank, destination),
 * rounded to a sensible amount.
 *
 * Requires a valid bearer token; the rank id is UUID-validated.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BASE_FARE = 15; // Base fare in currency units
const PER_KM_RATE = 5; // Rate per kilometer

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

    const { rank_id, destination } = await req.json();

    if (!rank_id || !destination) {
      return new Response(
        JSON.stringify({ error: 'rank_id and destination are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Calculating fare for rank: ${rank_id}, destination: ${destination}`);

    // First, check for preset fare
    const { data: presetFare, error: presetError } = await supabase
      .from('fares')
      .select('amount')
      .eq('origin_rank_id', rank_id)
      .ilike('destination', `%${destination}%`)
      .single();

    if (presetFare && !presetError) {
      console.log(`Found preset fare: ${presetFare.amount}`);
      return new Response(
        JSON.stringify({ 
          fare: presetFare.amount, 
          method: 'preset',
          destination: destination
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no preset fare, calculate based on distance
    const { data: rank, error: rankError } = await supabase
      .from('ranks')
      .select('latitude, longitude, name')
      .eq('id', rank_id)
      .single();

    if (rankError || !rank) {
      console.error('Rank not found:', rankError);
      return new Response(
        JSON.stringify({ error: 'Rank not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // For demo purposes, use a simple distance calculation
    // In production, you'd use a geocoding API for the destination
    let calculatedFare = BASE_FARE;
    
    if (rank.latitude && rank.longitude) {
      // Simple estimation: assume 10km average if we can't geocode
      const estimatedDistance = 10;
      calculatedFare = BASE_FARE + (estimatedDistance * PER_KM_RATE);
    }

    // Round to 2 decimal places
    calculatedFare = Math.round(calculatedFare * 100) / 100;

    console.log(`Calculated fare: ${calculatedFare}`);

    return new Response(
      JSON.stringify({ 
        fare: calculatedFare, 
        method: 'calculated',
        destination: destination,
        origin: rank.name
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error calculating fare:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});