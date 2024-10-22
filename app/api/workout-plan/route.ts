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
    const { goal, duration, branch } = await request.json();

    if (!goal || !duration || !branch) {
      return NextResponse.json({ error: 'Goal, duration, and branch are required' }, { status: 400 });
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

    // Generate workout plan using OpenAI
    const prompt = `Generate a ${duration}-week workout plan for a ${profile.age}-year-old ${branch} service member with the goal: ${goal}. Include daily workouts with exercises, sets, reps, and durations. Return the response as a JSON object with the following structure: { startDate: string, endDate: string, weeklyPlan: [{ day: string, summary: string, duration: number, caloriesBurned: number, workoutType: string, exercises: [{ name: string, sets: number, reps: number, duration: number, completed: boolean, difficulty: string }] }] }`;

    const completion = await openai.createCompletion({
      model: "text-davinci-002",
      prompt: prompt,
      max_tokens: 1000,
    });

    const workoutPlan = JSON.parse(completion.data.choices[0].text!);

    // Save workout plan to database
    const { data: savedPlan, error: saveError } = await supabase
      .from('WorkoutPlan')
      .insert({
        userId: user.id,
        plan: workoutPlan,
        startDate: workoutPlan.startDate,
        endDate: workoutPlan.endDate,
      })
      .select();

    if (saveError) {
      return NextResponse.json({ error: 'Failed to save workout plan' }, { status: 500 });
    }

    return NextResponse.json(savedPlan[0], { status: 201 });
  } catch (error) {
    console.error('Error generating workout plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  try {
    const user = (request as any).user;

    const { data: workoutPlan, error } = await supabase
      .from('WorkoutPlan')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Workout plan not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch workout plan' }, { status: 500 });
    }

    return NextResponse.json(workoutPlan);
  } catch (error) {
    console.error('Error fetching workout plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}