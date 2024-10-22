import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
// import { authMiddleware } from '@/middleware/auth';

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_ANON_KEY!);

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  // const authResponse = await authMiddleware(request);
  // if (authResponse.status !== 200) return authResponse;
  
  const user = (request as any).user;  // Authenticated user info from middleware

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('Profile')
    .select('*')
    .eq('userId', user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Generate workout plan using OpenAI
  const prompt = `Generate a workout plan based on ${profile}. Include daily workouts with exercises, sets, reps, and durations. Only output an object that I caneasily push to my sql database. The object should be formatted as the following:
   
  WorkoutPlan:
      type: object
      required:
        - id
        - startDate
        - endDate
        - weeklyPlan
      properties:
        id:
          type: string
          format: uuid
          example: 123e4567-e89b-12d3-a456-426614174000
        startDate:
          type: string
          format: date
          example: '2023-05-01'
        endDate:
          type: string
          format: date
          example: '2023-05-28'
        weeklyPlan:
          type: array
          items:
            $ref: '#/components/schemas/DailyWorkout'

    DailyWorkout:
      type: object
      required:
        - day
        - summary
        - duration
        - caloriesBurned
        - workoutType
        - exercises
      properties:
        day:
          type: string
          format: date
          example: '2023-05-01'
        summary:
          type: string
          example: 'Strength Training'
        duration:
          type: integer
          format: int32
          minimum: 0
          example: 60
        caloriesBurned:
          type: integer
          format: int32
          minimum: 0
          example: 300
        workoutType:
          type: string
          enum: [cardio, strength, yoga, hiit, rest]
          example: strength
        exercises:
          type: array
          items:
            $ref: '#/components/schemas/Exercise'

    Exercise:
      type: object
      required:
        - name
      properties:
        name:
          type: string
          example: 'Push-ups'
        sets:
          type: integer
          format: int32
          minimum: 1
          example: 3
        reps:
          type: integer
          format: int32
          minimum: 1
          example: 15
        duration:
          type: integer
          format: int32
          minimum: 1
          example: 30
        completed:
          type: boolean
          example: false
        difficulty:
          type: string
          enum: [easy, just-right, hard]
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ role: 'system', content: prompt }],
    model: 'gpt-3.5-turbo',
    max_tokens: 1000,
  });

  const workoutPlan = completion.choices[0]?.message?.content;

  // Save workout plan to database
  const { data: savedPlan, error: saveError } = await supabase
    .from('workout_plans')
    .insert({
      userId: user.id,
      plan: workoutPlan,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select();

  if (saveError) {
    return NextResponse.json({ error: saveError.message }, { status: 500 });
  }

  return NextResponse.json(savedPlan[0], { status: 201 });
}