import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: Request) {
  try {
    const { refresh_token } = await request.json();

    if (!refresh_token) {
      return NextResponse.json(
        { error: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    // Fetch user metadata from Supabase
    const { data: { user } } = await supabase.auth.getUser(data.session?.access_token);

    return NextResponse.json({
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      expires_in: data.session?.expires_in,
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