import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateNutritionPlan } from '@/lib/llmFunctions';
import { v4 as uuidv4 } from 'uuid';


const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  const { id, startDate, endDate } = await request.json();

  console.log("req", id, startDate, endDate);

  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Generate the nutrition plan
  const nutritionPlan = await generateNutritionPlan(profile);

  console.log("nutritionPlan", nutritionPlan.weeklyPlan.meals);

  try {
    // Insert the nutrition plan into 'nutrition_plans' table
    const { data: savedPlan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        id: uuidv4(),
        user_id: id,
        start_date: nutritionPlan.startDate,
        end_date: nutritionPlan.endDate,
        //TODO: Add goal to DB?
      })
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("savedPlan", savedPlan);

    // Loop over each day's plan in the weeklyPlan and insert meals
    for (const dayPlan of nutritionPlan.weeklyPlan) {
      for (const meal of dayPlan.meals) {
        // Insert each meal into 'meals' table
        const { data: savedMeals, error: mealsError } = await supabase
          .from('meals')
          .insert({
            id: uuidv4(),
            nutrition_plan_id: savedPlan[0].id,
            name: meal.name,
             // protein: food.protein,
              // carbs: food.carbs,
              // fat: food.fat,  
                                //TODO: Add these fields to DB?
          })
          .select();

        if (mealsError) {
          return NextResponse.json({ error: mealsError.message }, { status: 500 });
        }

        console.log("savedMeals", savedMeals);

        // Insert each food related to the meal (if needed)
        for (const food of meal.foods) {
          const { data: savedFoods, error: foodsError } = await supabase
            .from('foods')
            .insert({
              id: uuidv4(),
              meal_id: savedMeals[0].id, // Reference to the saved meal
              name: food.name,
              amount: food.amount,
              calories: food.calories,
              // protein: food.protein,
              // carbs: food.carbs,
              // fat: food.fat,   
                                    //TODO: Add these fields to DB?
            })
            .select();

          if (foodsError) {
            return NextResponse.json({ error: foodsError.message }, { status: 500 });
          }

          console.log("savedFoods", savedFoods);
        }
      }
    }

    // Return saved plan
    return NextResponse.json(savedPlan[0], { status: 201 });

  } catch (error) {
    console.error("Error saving nutrition plan:", error);

    // Narrowing the error type to Error
    if (error instanceof Error) {
      return NextResponse.json({ error: `Error saving nutrition plan: ${error.message}` }, { status: 500 });
    }

    // If it's not an Error object, return a generic message
    return NextResponse.json({ error: 'An unknown error occurred' }, { status: 500 });
  }
}
