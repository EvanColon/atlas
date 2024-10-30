import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Define types for Supabase tables

interface Exercise {
  id: string;
  daily_workout_id: string;
  name: string;
  sets: number;
  reps: number;
  duration: number;
  weight: number;
  difficulty: string;
}

interface Food {
  id: string;
  meal_id: string;
  name: string;
  amount: number;
  calories: number;
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: Request) {
  try {
    const { id, userInput }: { id: string; userInput: string } = await req.json();

    if (!id || !userInput) {
      return NextResponse.json(
        { error: 'userId and userInput are required.' },
        { status: 400 }
      );
    }
      //Fetch the user profile data
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', id)
        .single();

      if (profileError) {
        console.error("Error fetching profile data:", profileError);
        return NextResponse.json({ error: profileError.message }, { status: 500 });
      }
      const profileData = profile

      // Initialize context strings
      let workoutPlanContext = '';
      let nutritionPlanContext = '';

      //Fetch the latest workout plan for the user
      const { data: workoutPlan, error: workoutPlanError } = await supabase
        .from('workout_plans')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!workoutPlanError && workoutPlan?.length) {
        const workoutPlanId = workoutPlan[0].id;
        //Fetch daily workouts and exercises for the workout plan
        const { data: dailyWorkouts, error: dailyWorkoutsError } = await supabase
          .from('daily_workouts')
          .select('*')
          .eq('workout_plan_id', workoutPlanId);

        if (!dailyWorkoutsError) {
          const workoutsWithExercises = await Promise.all(
            dailyWorkouts.map(async (dailyWorkout) => {
              const { data: exercises, error: exercisesError } = await supabase
                .from('exercises')
                .select('*')
                .eq('daily_workout_id', dailyWorkout.id);

              if (exercisesError) throw new Error(exercisesError.message);

              return {
                ...dailyWorkout,
                exercises,
              };
            })
          );

          // Format workout plan context
          workoutPlanContext = `
            Workout Plan (Goal: ${workoutPlan[0].goal}, Start Date: ${workoutPlan[0].start_date}, End Date: ${workoutPlan[0].end_date})
            ${workoutsWithExercises.map(dailyWorkout => `
              Date: ${dailyWorkout.date}, Type: ${dailyWorkout.workout_type}, Duration: ${dailyWorkout.duration} mins, Calories Burned: ${dailyWorkout.calories_burned}
              Summary: ${dailyWorkout.summary}
              Exercises:
              ${dailyWorkout.exercises.map((exercise: Exercise) => `
                - Name: ${exercise.name}, Sets: ${exercise.sets}, Reps: ${exercise.reps}, Duration: ${exercise.duration} mins, Weight: ${exercise.weight} lbs, Difficulty: ${exercise.difficulty}
              `).join('')}
            `).join('')}
          `;
        }
      }

      //Fetch the latest nutrition plan for the user
      const { data: nutritionPlan, error: nutritionPlanError } = await supabase
        .from('nutrition_plans')
        .select('*')
        .eq('user_id', id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (!nutritionPlanError && nutritionPlan?.length) {
        const nutritionPlanId = nutritionPlan[0].id;

        //Fetch meals and foods for the nutrition plan
        const { data: meals, error: mealsError } = await supabase
          .from('meals')
          .select('*')
          .eq('nutrition_plan_id', nutritionPlanId);

        if (!mealsError) {
          const mealsWithFoods = await Promise.all(
            meals.map(async (meal) => {
              const { data: foods, error: foodsError } = await supabase
                .from('foods')
                .select('*')
                .eq('meal_id', meal.id);

              if (foodsError) throw new Error(foodsError.message);

              return {
                ...meal,
                foods,
              };
            })
          );

          // Format nutrition plan context
          nutritionPlanContext = `
            Nutrition Plan (Start Date: ${nutritionPlan[0].start_date}, End Date: ${nutritionPlan[0].end_date})
            ${mealsWithFoods.map(meal => `
              Meal: ${meal.name}
              Foods:
              ${meal.foods.map((food: Food) => `
                - ${food.name}, Amount: ${food.amount}g, Calories: ${food.calories} kcal
              `).join('')}
            `).join('')}
          `;
        }
      }

      // Step 6: Combine context and generate the AI response
      const today = new Date();
      const formattedDate = today.toISOString().split('T')[0]; // Formats to 'YYYY-MM-DD'

      const response = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: `You are a helpful assistant that answers questions about the content of a workout and nutrition plan based on its contents and provide suggestions based on the user's profile data. If any workout plan, nutrition plan, or profile data is not inlcuded in the context then you should NOT make up facts. Simply state that the user does not have any of this data in their records. Today's date is ${formattedDate} and the user profile data includes ${profileData}.`},
          { role: "user", content: `${workoutPlanContext ? `Workout Plan: ${workoutPlanContext}\n\n` : ''}${nutritionPlanContext ? `Nutrition Plan: ${nutritionPlanContext}\n\n` : ''}Question: ${userInput}` },
        ],
        max_tokens: 250,
      });

  return NextResponse.json(
    {response: response.choices[0].message?.content}, 
    {status: 200})
  
  } catch (error) {
    console.error("Error generating AI response:", error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}