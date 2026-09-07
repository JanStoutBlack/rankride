/**
 * maintenance — vehicle issue log API.
 *
 * POST   create an issue (vehicle_id + description) — drivers and owners.
 * GET    list issues, optionally filtered by status or vehicle — owners.
 * PATCH  update an issue's status — owners.
 *
 * Every request must carry a valid bearer token; the caller is resolved from
 * the token before any query runs.
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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth header to verify user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const method = req.method;

    // POST - Create maintenance issue
    if (method === 'POST') {
      const { vehicle_id, description } = await req.json();

      if (!vehicle_id || !description) {
        return new Response(
          JSON.stringify({ error: 'vehicle_id and description are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Creating maintenance issue for vehicle: ${vehicle_id}`);

      const { data, error } = await supabase
        .from('maintenance_logs')
        .insert({
          vehicle_id,
          description,
          reported_by: user.id,
          status: 'open'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating maintenance log:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to create maintenance issue' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET - List maintenance issues
    if (method === 'GET') {
      const status = url.searchParams.get('status');
      const vehicle_id = url.searchParams.get('vehicle_id');

      let query = supabase
        .from('maintenance_logs')
        .select(`
          *,
          vehicles:vehicle_id (plate, rank_id),
          reporter:reported_by (full_name)
        `)
        .order('created_at', { ascending: false });

      if (status) {
        query = query.eq('status', status);
      }

      if (vehicle_id) {
        query = query.eq('vehicle_id', vehicle_id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching maintenance logs:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch maintenance issues' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PATCH - Update maintenance status
    if (method === 'PATCH') {
      const { id, status } = await req.json();

      if (!id || !status) {
        return new Response(
          JSON.stringify({ error: 'id and status are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      if (!['open', 'in_progress', 'resolved'].includes(status)) {
        return new Response(
          JSON.stringify({ error: 'Invalid status' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log(`Updating maintenance ${id} to status: ${status}`);

      const { data, error } = await supabase
        .from('maintenance_logs')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();

      if (error) {
        console.error('Error updating maintenance log:', error);
        return new Response(
          JSON.stringify({ error: 'Failed to update maintenance issue' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: true, data }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in maintenance function:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});