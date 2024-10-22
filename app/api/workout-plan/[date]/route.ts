import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/middleware/auth';

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

export async function PUT(request: Request, { params }: { params: { date: string } }) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  try {
    const user = (request as any).user;
    const { exercises } = await request.json();
    const { date } = params;

    if (!exercises || !date) {
      return NextResponse.json({ error: 'Exercises and date are required' }, { status: 400 });
    }

    // Fetch the current workout plan
    const { data: workoutPlan, error: fetchError } = await supabase
      .from('WorkoutPlan')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false })
      .limit(1)
      .single();

    if (fetchError) {
      return NextResponse.json({ error: 'Workout plan not found' }, { status: 404 });
    }

    // Update the specific day in the workout plan
    const updatedWeeklyPlan = workoutPlan.plan.weeklyPlan.map((day: any) => {
      if (day.day === date) {
        return {
          ...day,
          exercises: exercises.map((exercise: any) => ({
            ...exercise,
            completed: exercise.completed,
            difficulty: exercise.difficulty
          }))
        };
      }
      return day;
    });

    // Save the updated workout plan
    const { data: updatedPlan, error: updateError } = await supabase
      .from('WorkoutPlan')
      .update({ plan: { ...workoutPlan.plan, weeklyPlan: updatedWeeklyPlan } })
      .eq('id', workoutPlan.id)
      .select();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update workout plan' }, { status: 500 });
    }

    const updatedDailyWorkout = updatedPlan[0].plan.weeklyPlan.find((day: any) => day.day === date);
    return NextResponse.json(updatedDailyWorkout);
  } catch (error) {
    console.error('Error updating workout:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}