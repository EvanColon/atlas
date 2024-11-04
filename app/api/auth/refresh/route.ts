import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

// In-memory cache for the user token
let cachedToken: { access_token: string; refresh_token: string; expires_in: number; user: {} } | null = null;
let tokenExpiry: number | null = null;

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    // Check if the cached token is still valid
    const currentTime = Math.floor(Date.now() / 1000); // Current time in seconds
    if (cachedToken && tokenExpiry && currentTime < tokenExpiry) {
      // Return the cached token if it's still valid
      return NextResponse.json({
        access_token: cachedToken.access_token,
        refresh_token: cachedToken.refresh_token,
        expires_in: cachedToken.expires_in,
        user: cachedToken.user
      });
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch user metadata from Supabase
    const { data: { user } } = await supabase.auth.getUser(data.session?.access_token);

    // Cache the new token and its expiry time
    cachedToken = {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.user_metadata?.role || 'BaseMember', // Default to 'BaseMember' if role is not set
      },
    };
    tokenExpiry = currentTime + (data.session?.expires_in || 0); // Set expiry time

    console.log('user', user)

    return NextResponse.json({
      access_token: cachedToken.access_token,
      refresh_token: cachedToken.refresh_token,
      expires_in: cachedToken.expires_in,
      user: {
        id: user?.id,
        email: user?.email,
        role: user?.user_metadata?.role || 'BaseMember', // Default to 'BaseMember' if role is not set
      },
    });
  } catch (error) {
    console.error('Refresh token error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}