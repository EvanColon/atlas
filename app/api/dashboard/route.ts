import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/middleware/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;

  // Fetch the user's profile including the dashboard layout
  const { data, error } = await supabase
    .from('profiles')
    .select('dashboard_layout')
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data.dashboard_layout || {});
}

export async function POST(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;
  const layout = await request.json();

  // Update the user's profile with the new dashboard layout
  const { data, error } = await supabase
    .from('profiles')
    .update({ dashboard_layout: layout })
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
} 