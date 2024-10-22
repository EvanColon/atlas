import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();

    console.log("username", username)
    console.log("password", password)

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: username,
      password: password,
    });

    console.log("data", data)
    console.log("error", error)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    // Fetch user metadata from Supabase
    const { data: { user } } = await supabase.auth.getUser(data.session.access_token);

    return NextResponse.json({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_in: data.session.expires_in,
      user: {
        id: user?.id,
        username: user?.email,
        role: user?.user_metadata?.role || 'user', // Default to 'user' if role is not set
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
