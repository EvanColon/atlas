import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';
import { authMiddleware } from '@/middleware/auth';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);
const configuration = new Configuration({ apiKey: process.env.OPENAI_API_KEY });
const openai = new OpenAIApi(configuration);

export async function POST(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  try {
    const user = (request as any).user;
    const { goal, dietaryRestrictions } = await request.json();

    if (!goal) {
      return NextResponse.json({ error: 'Goal is required' }, { status: 400 });
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('Profile')
      .select('*')
      .eq('userId', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    // Generate nutrition plan using OpenAI
    const prompt = `Generate a 7-day nutrition plan for a ${profile.age}-year-old ${profile.branch} service member with the goal: ${goal}. Consider these dietary restrictions: ${dietaryRestrictions || profile.dietaryRestrictions}. Include daily meals with foods, amounts, and calorie counts. Return the response as a JSON object with the following structure: { dailyCalories: number, macronutrients: { protein: number, carbohydrates: number, fat: number }, meals: [{ name: string, foods: [{ name: string, amount: string, calories: number }] }] }`;

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
        userId: user.id,
        plan: nutritionPlan,
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .select();

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save nutrition plan' }, { status: 500 });
    }

    return NextResponse.json(savedPlan[0], { status: 201 });
  } catch (error) {
    console.error('Error generating nutrition plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  try {
    const user = (request as any).user;

    const { data: nutritionPlan, error } = await supabase
      .from('NutritionPlan')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Nutrition plan not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch nutrition plan' }, { status: 500 });
    }

    return NextResponse.json(nutritionPlan);
  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}