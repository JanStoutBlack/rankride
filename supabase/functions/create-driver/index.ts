/**
 * create-driver — owner-only driver onboarding.
 *
 * Verifies the caller's token, confirms they hold the `owner` role, then
 * creates the driver's auth user, sets their role to `driver` in `user_roles`,
 * fills in their profile (phone, name), and optionally links them to a vehicle.
 *
 * This exists because drivers must never be able to self-register with the
 * driver role from the client.
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

    // Get auth header to verify caller is an owner
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify caller is an owner
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .in('role', ['admin', 'superadmin', 'owner'])
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Only administrators can create drivers' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, phone, full_name, vehicle_id } = await req.json();

    if (!email || !password || !phone || !full_name) {
      return new Response(
        JSON.stringify({ error: 'email, password, phone, and full_name are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Creating driver account for: ${email}`);

    // Create user with admin API
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      phone,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone,
        role: 'driver'
      }
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The trigger will create profile and user_role, but we need to ensure it's driver
    // Update the user_roles entry to be 'driver' (trigger defaults to customer for safety)
    const { error: roleUpdateError } = await supabase
      .from('user_roles')
      .update({ role: 'driver' })
      .eq('user_id', newUser.user.id);

    if (roleUpdateError) {
      console.error('Error updating role:', roleUpdateError);
    }

    // Update profiles table too
    const { error: profileUpdateError } = await supabase
      .from('profiles')
      .update({ role: 'driver' })
      .eq('id', newUser.user.id);

    if (profileUpdateError) {
      console.error('Error updating profile role:', profileUpdateError);
    }

    // If vehicle_id provided, assign driver to vehicle
    if (vehicle_id) {
      const { error: vehicleError } = await supabase
        .from('vehicles')
        .update({ driver_id: newUser.user.id })
        .eq('id', vehicle_id);

      if (vehicleError) {
        console.error('Error assigning vehicle:', vehicleError);
      }
    }

    console.log(`Driver created successfully: ${newUser.user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.user.id,
        email: newUser.user.email
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-driver:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
