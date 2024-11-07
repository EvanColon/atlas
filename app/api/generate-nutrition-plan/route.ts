import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generateNutritionPlan } from '@/lib/llmFunctions';
import { v4 as uuidv4 } from 'uuid';
import { authMiddleware } from '@/middleware/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(request: Request) {
  let { id, personalInfo, fitnessGoals, dietaryInfo } = await request.json();

  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  // If the request has a given user id, use that, otherwise use the user from the token
  const user = (request as any).user;
  if (!id) {
    id = user.id;
  }

  console.log("personalInfo", personalInfo);
  console.log("fitnessGoals", fitnessGoals);
  console.log("dietaryInfo", dietaryInfo);

  
  // Fetch user profile
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', id)
    .single();

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  // Merge profile data with request data
  const nutritionPlanRequest = {
    personalInfo: {
      age: profile.age,
      gender: profile.gender,
      height: profile.height,
      currentWeight: profile.weight,
      targetWeight: personalInfo?.targetWeight || profile.target_weight || profile.weight,
      activityLevel: profile.activity_level,
      ptTestDate: profile.next_pt_test
    },
    fitnessGoals: {
      primary: fitnessGoals?.primary || profile.fitness_goal || 'maintenance',
      targetWeight: fitnessGoals?.targetWeight || profile.target_weight || profile.weight,
      weeklyWorkouts: fitnessGoals?.weeklyWorkouts ?? profile.weekly_workouts ?? 3
    },
    dietaryInfo: {
      restrictions: profile.dietary_restrictions || [],
      allergies: profile.food_allergies || [],
      mealsPerDay: dietaryInfo?.mealsPerDay || profile.meals_per_day || 3,
      diningFacilityAccess: dietaryInfo?.diningFacilityAccess ?? profile.dining_facility_access ?? false
    }
  };

  console.log('Generating nutrition plan...');
  console.log("nutritionPlanRequest", nutritionPlanRequest);
  // Generate the nutrition plan
  const nutritionPlan = await generateNutritionPlan(nutritionPlanRequest);

  console.log("nutritionPlan first day meals", nutritionPlan.weeklyPlan[0].meals);

  try {
    // Insert the nutrition plan into 'nutrition_plans' table
    const { data: savedPlan, error } = await supabase
      .from('nutrition_plans')
      .insert({
        user_id: id,
        start_date: nutritionPlan.startDate,
        end_date: nutritionPlan.endDate,
        daily_calories: nutritionPlan.dailyCalorieTarget,
        goal: nutritionPlan.goal,
        protein: nutritionPlan.protein,
        carbohydrates: nutritionPlan.carbohydrates,
        fat: nutritionPlan.fat
      })
      .select();

    if (error) {
      console.error("Error saving nutrition plan:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("savedPlan", savedPlan);

    // Loop over each day's plan in the weeklyPlan and insert meals
    if (nutritionPlan.weeklyPlan && Array.isArray(nutritionPlan.weeklyPlan)) {
      for (const dayPlan of nutritionPlan.weeklyPlan) {
        if (dayPlan.meals && Array.isArray(dayPlan.meals)) {
          for (const meal of dayPlan.meals) {
            // Insert each meal into 'meals' table
            const { data: savedMeals, error: mealsError } = await supabase
              .from('meals')
              .insert({
                id: uuidv4(),
                nutrition_plan_id: savedPlan[0].id,
                name: meal.name,
                time: meal.time,
                meal_type: 'dining_facility'
              })
              .select();

            if (mealsError) {
              return NextResponse.json({ error: mealsError.message }, { status: 500 });
            }

            console.log("savedMeals", savedMeals);

            // Insert foods with their source type
            for (const food of meal.diningFacilityOptions || []) {
              await supabase
                .from('foods')
                .insert({
                  id: uuidv4(),
                  meal_id: savedMeals[0].id,
                  name: food.name,
                  amount: food.portion,
                  calories: food.calories,
                  allergens: food.allergens,
                  source_type: 'dining_facility'
                });
            }

            for (const food of meal.alternativeOptions || []) {
              await supabase
                .from('foods')
                .insert({
                  id: uuidv4(),
                  meal_id: savedMeals[0].id,
                  name: food.name,
                  amount: food.amount,
                  calories: food.calories,
                  source_type: 'alternative'
                });
            }
          }
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
