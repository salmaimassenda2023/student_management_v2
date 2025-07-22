import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { create } from 'https://deno.land/x/djwt@v2.2/mod.ts';

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Firebase token verification using Firebase Admin REST API
async function verifyFirebaseToken(token) {
  try {
    const projectId = Deno.env.get('FIREBASE_PROJECT_ID');

    if (!projectId) {
      throw new Error('FIREBASE_PROJECT_ID not configured');
    }

    // First, let's try to get the public keys from Google
    const keysResponse = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');

    if (!keysResponse.ok) {
      console.error('Failed to fetch Firebase public keys');
      throw new Error('Failed to fetch Firebase public keys');
    }

    // Alternative: Use Firebase's token verification endpoint
    const verifyResponse = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${Deno.env.get('FIREBASE_WEB_API_KEY')}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: token,
      }),
    });

    console.log('Firebase API response status:', verifyResponse.status);

    if (!verifyResponse.ok) {
      const errorText = await verifyResponse.text();
      console.error('Firebase token verification failed:', errorText);
      throw new Error(`Token verification failed: ${errorText}`);
    }

    const data = await verifyResponse.json();
    console.log('Firebase API response data:', JSON.stringify(data, null, 2));

    if (!data.users || data.users.length === 0) {
      throw new Error('No user found for token');
    }

    const user = data.users[0];

    // Validate required fields
    if (!user.localId) {
      throw new Error('Missing user ID in Firebase response');
    }

    return {
      uid: user.localId,
      email: user.email || '',
      name: user.displayName || user.email || '',
      emailVerified: user.emailVerified === 'true',
    };
  } catch (error) {
    console.error('Firebase token verification error:', error);
    throw new Error(`Invalid Firebase token: ${error.message}`);
  }
}

serve(async (req) => {
  // Debug environment variables
  console.log('=== Environment Check ===');
  console.log('SUPABASE_URL:', Deno.env.get('SUPABASE_URL') ? 'Loaded' : 'NOT LOADED');
  console.log('SUPABASE_SERVICE_ROLE_KEY:', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ? 'Loaded' : 'NOT LOADED');
  console.log('SUPABASE_JWT_SECRET:', Deno.env.get('SUPABASE_JWT_SECRET') ? 'Loaded' : 'NOT LOADED');
  console.log('FIREBASE_PROJECT_ID:', Deno.env.get('FIREBASE_PROJECT_ID') ? 'Loaded' : 'NOT LOADED');
  console.log('FIREBASE_WEB_API_KEY:', Deno.env.get('FIREBASE_WEB_API_KEY') ? 'Loaded' : 'NOT LOADED');

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('=== Processing Request ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));

    // 1. Get the Firebase token from the request body
    const requestBody = await req.json();
    console.log('Request body:', requestBody);

    const { token } = requestBody;
    if (!token) {
      throw new Error('Firebase ID token is missing from request body');
    }

    console.log('Firebase token received (first 20 chars):', token.substring(0, 20) + '...');

    // 2. Verify the Firebase ID token
    console.log('=== Verifying Firebase Token ===');
    const { uid, email, name, emailVerified } = await verifyFirebaseToken(token);

    console.log('Firebase token verified successfully for user:', {
      uid,
      email,
      name,
      emailVerified
    });

    // 3. Initialize the Supabase Admin client
    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 4. UPSERT the user into your users table
    console.log('=== Upserting User to Supabase ===');
    const userPayload = {
      firebase_uid: uid,
      email: email,
      user_type: 'CLIENT',
      full_name: name || email,
      email_verified: emailVerified,
      updated_at: new Date().toISOString()
    };

    console.log('User payload:', userPayload);

    const { data: user, error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert(userPayload, { onConflict: 'firebase_uid' })
        .select()
        .single();

    if (upsertError) {
      console.error('Supabase upsert error:', upsertError);
      throw new Error(`Database error: ${upsertError.message}`);
    }

    console.log('User upserted successfully:', user);

    // 5. Create a Supabase JWT
    console.log('=== Creating Supabase JWT ===');
    const jwtSecret ='185bdb26-52a4-4ba4-9855-9f3c3922e764';
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET environment variable is not set');
    }

    const now = Math.floor(Date.now() / 1000);
    const expiresIn = 60 * 60 * 24; // 24 hours
    const claims = {
      sub: user.id.toString(),
      role: 'authenticated',
      email: user.email,
      user_metadata: {
        user_type: user.user_type,
        full_name: user.full_name,
        firebase_uid: user.firebase_uid
      },
      app_metadata: {
        provider: 'firebase',
        providers: ['firebase']
      },
      iat: now,
      exp: now + expiresIn,
      aud: 'authenticated'
    };

    console.log('JWT claims:', claims);

    // Create the key for signing
    const key = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(jwtSecret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign', 'verify']
    );

    const supabaseToken = await create({ alg: 'HS256', typ: 'JWT' }, claims, key);

    console.log('JWT created successfully');

    // 6. Return the Supabase session details
    const response = {
      access_token: supabaseToken,
      token_type: 'bearer',
      expires_in: expiresIn,
      expires_at: now + expiresIn,
      user: user,
      session: {
        access_token: supabaseToken,
        token_type: 'bearer',
        expires_in: expiresIn,
        expires_at: now + expiresIn,
        user: user
      }
    };

    console.log('=== Success Response ===');
    console.log('Response user ID:', user.id);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('=== Edge Function Error ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);

    return new Response(JSON.stringify({
      error: error.message || 'An unexpected error occurred',
      details: error.stack
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});