import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

export async function POST(request: Request) {
  const { userId } = await request.json();

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', userId)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Generate nutrition plan using OpenAI
  const prompt = `Generate a 7-day nutrition plan for a ${profile.age}-year-old ${profile.branch} service member with the following goals: ${profile.nutritionGoals}. Consider these dietary restrictions: ${profile.dietaryRestrictions}. Include daily meals with foods, amounts, and calorie counts.`;

  const completion = await openai.createCompletion({
    model: "text-davinci-002",
    prompt: prompt,
    max_tokens: 1000,
  });

  const nutritionPlan = JSON.parse(completion.data.choices[0].text!);

  // Save nutrition plan to database
  const { data: savedPlan, error: saveError } = await supabase
    .from('NutritionPlan')
    .insert({
      userId: userId,
      plan: nutritionPlan,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json(savedPlan[0], { status: 201 });
}