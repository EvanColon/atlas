import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/middleware/auth';
import { v4 as uuidv4 } from 'uuid';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  // const authResponse = await authMiddleware(request);
  // if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  // const authResponse = await authMiddleware(request);
  // if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;
  const profile = await request.json();

  const { data, error } = await supabase
    .from('profiles')
    .upsert({ 
      ...profile, 
      id: uuidv4(), 
    })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data[0], { status: 201 });
}