import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';  // Correct import
import { authMiddleware } from '@/middleware/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);


// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // Handle authentication
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;  // Authenticated user info from middleware

  // Fetch user profile from Supabase
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Define the prompt for OpenAI to generate a 7-day nutrition plan
  const prompt = `Generate a 7-day nutrition plan for a ${profile.age}-year-old ${profile.branch} service member with the following goals: ${profile.nutritionGoals}. Consider these dietary restrictions: ${profile.dietaryRestrictions}. Include daily meals with foods, amounts, and calorie counts.`;

  // Use OpenAI's chat completion API to generate the nutrition plan
  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'gpt-3.5-turbo',
    max_tokens: 1000,
  });

  const nutritionPlan = completion.choices[0]?.message?.content;

  if (!nutritionPlan) {
    return NextResponse.json({ error: 'Failed to generate nutrition plan' }, { status: 500 });
  }

  // Save the generated nutrition plan to Supabase
  const { data: savedPlan, error: saveError } = await supabase
    .from('NutritionPlan')
    .insert({
      userId: user.id,
      plan: nutritionPlan,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  // Return the saved plan as a response
  return NextResponse.json(savedPlan[0], { status: 201 });
}
