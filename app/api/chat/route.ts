import { diningFacilityFunction, getDiningFacilityMenu, nutritionPlanFunction, workoutPlanFunction } from '@/lib/llmFunctions';
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

    // Fetch the user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', id)
      .single();

    if (profileError) {
      console.error("Error fetching profile data:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }
    const profileData = profile;

    // Initialize context strings
    let workoutPlanContext = '';
    let nutritionPlanContext = '';

    // Fetch the latest workout plan for the user
    const { data: workoutPlan, error: workoutPlanError } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!workoutPlanError && workoutPlan?.length) {
      const workoutPlanId = workoutPlan[0].id;
      // Fetch daily workouts and exercises for the workout plan
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

    // Fetch the latest nutrition plan for the user
    const { data: nutritionPlan, error: nutritionPlanError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false })
      .limit(1);

    if (!nutritionPlanError && nutritionPlan?.length) {
      const nutritionPlanId = nutritionPlan[0].id;

      // Fetch meals and foods for the nutrition plan
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
    const dayOfWeek = today.getDay();
    const formattedDate = today.toISOString().split('T')[0];
    const formattedTime = today.toLocaleTimeString();

    const messages = [
      {
        role: "system" as const,
        content: `You are a helpful assistant that answers questions about the content of a workout and nutrition plan based on its contents and provide suggestions based on the user's profile data.
        If any workout plan, nutrition plan, or profile data is not included in the context then you should NOT make up facts. Simply state that the user does not have any of this data in their records.
        Today is ${dayOfWeek} ${formattedDate} and the time is ${formattedTime}.
        The user profile data includes ${JSON.stringify(profileData)}.`
      },
      {
        role: "user" as const,
        content: `${workoutPlanContext ? `Workout Plan: ${workoutPlanContext}\n\n` : ''}${nutritionPlanContext ? `Nutrition Plan: ${nutritionPlanContext}\n\n` : ''}Question: ${userInput}`
      }
    ];

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      functions: [diningFacilityFunction, nutritionPlanFunction, workoutPlanFunction],
      function_call: "auto",
      temperature: 0.7,
      max_tokens: 1000,
    });

    const responseMessage = response.choices[0].message;

    // Handle function calls if present
    if (responseMessage.function_call) {
      const functionName = responseMessage.function_call.name;
      const functionArgs = JSON.parse(responseMessage.function_call.arguments);

      // Execute the appropriate function based on the name
      let functionResult;
      switch (functionName) {
        case "get_dining_facility_menu":
          functionResult = await getDiningFacilityMenu(functionArgs.day, functionArgs.meal);
          break;
        // Add other function cases here as needed
        default:
          throw new Error(`Unknown function: ${functionName}`);
      }

      // Create a follow-up message with the function result
      const secondResponse = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          ...messages,
          responseMessage,
          {
            role: "function" as const,
            name: functionName,
            content: JSON.stringify(functionResult),
          },
        ],
        temperature: 0.7,
        max_tokens: 1000,
      });

      return NextResponse.json({
        response: secondResponse.choices[0].message.content,
        functionCall: {
          name: functionName,
          result: functionResult,
        },
      }, { status: 200 });
    }

    // Return regular response if no function was called
    return NextResponse.json({
      response: responseMessage.content,
    }, { status: 200 });

  } catch (error) {
    console.error("Error generating AI response:", error);
    return NextResponse.json(
      { error: 'An internal error occurred. Please try again later.' },
      { status: 500 }
    );
  }
}