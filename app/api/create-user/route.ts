import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);


export async function POST(request: Request) {
  const { email, password, role } = await request.json();

  // Check if user already exists by email
  const { data: existingUser, error: existingUserError } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .single();

  if (existingUser) {
    return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 });
  }

  if (existingUserError && existingUserError.code !== 'PGRST116') {
    // Handle any error that isn't related to user not being found
    return NextResponse.json({ error: existingUserError.message }, { status: 500 });
  }

  // Hash the password using bcrypt
  const saltRounds = 10;
  const hashedPassword = await bcrypt.hash(password, saltRounds)

  // const newId = uuidv4();  // Generate a valid UUID

  // Insert new user with hashed password
  const { data: newUser, error: newUserError } = await supabase
    .from('users')
    .insert({
      id: uuidv4(),
      email,
      password_hash: hashedPassword, // Store the hashed password
      role: role || 'BaseMember',    // Default role, could be configurable
    })
    .select()
    .single();

  if (newUserError) {
    return NextResponse.json({ error: newUserError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'User created successfully', user: newUser }, { status: 201 });
}
