import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { OpenAI } from 'openai';
// import { authMiddleware } from '@/middleware/auth';

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
  // const authResponse = await authMiddleware(request);
  // if (authResponse.status !== 200) return authResponse;
  
  // const user = (request as any).user;  // Authenticated user info from middleware
  const user = await request.json();

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }



  // Generate workout plan using OpenAI
  const prompt = `Generate a workout plan based on these user profile parameters ${profile}. Include daily workouts with exercises, sets, reps, and durations. Only output a JSON object that I can easily parse and push to my sql databases. The object should be formatted as the following:
   
  WorkoutPlan:
      type: object
      required:
        - startDate
        - endDate
        - weeklyPlan
      properties:
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
  `;

  const completion = await openai.chat.completions.create({
    messages: [{ 
      role: 'system', content: 'You are a proffesional trainer.'},
      {
        role: 'user', 
        content: prompt 
      }],
    model: 'gpt-3.5-turbo',
    max_tokens: 1000,
    response_format: { "type": "json_object" },
  });

  const workoutPlan = completion.choices[0].message.content;

  // Save workout plan to database
  // const { data: savedPlan, error: saveError } = await supabase
  //   .from('workout_plans')
  //   .insert({
  //     userId: user.id,
  //     plan: workoutPlan,
  //     startDate: new Date().toISOString(),
  //     endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  //   })
  //   .select();

  // if (saveError) {
  //   return NextResponse.json({ error: saveError.message }, { status: 500 });
  // }

  return NextResponse.json(workoutPlan, { status: 201 });
}