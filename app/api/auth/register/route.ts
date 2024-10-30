import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

export async function POST(request: Request) {
  try {
    const { email, password, name, age, branch } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'BaseMember', // Assigns the lowest role by default
        },
      },
    });

    if (signupError) {
      console.error('Signup error:', signupError);
      return NextResponse.json({ error: signupError.message }, { status: 400 });
    }

    // Create a blank profile for the user
    const { data: profileData, error: profileError } = await supabase.from('profiles').insert({
      user_id: signupData.user?.id,
      name,
      age,
      branch,
    });

    if (profileError) {
      console.error('Profile creation error:', profileError);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({
      message: 'User registered successfully',
      user: {
        id: signupData.user?.id,
        email: signupData.user?.email,
        role: signupData.user?.user_metadata?.role,
      },
    }, { status: 201 }); // 201 Created status for successful resource creation
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
