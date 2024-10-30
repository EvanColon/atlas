import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/middleware/auth';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  try {
    const user = (request as any).user;

    // Fetch the user profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // Fetch the latest nutrition plan for the user
    const { data: nutritionPlan, error: nutritionPlanError } = await supabase
      .from('nutrition_plans')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (nutritionPlanError) {
      if (nutritionPlanError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Nutrition plan not found' }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch nutrition plan' }, { status: 500 });
    }

    // Fetch meals for the nutrition plan
    const { data: meals, error: mealsError } = await supabase
      .from('meals')
      .select('*')
      .eq('nutrition_plan_id', nutritionPlan.id);

    if (mealsError) {
      return NextResponse.json({ error: mealsError.message }, { status: 500 });
    }

    // Fetch foods for each meal
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

    // Format the response
    const response = {
      nutritionPlan: {
        ...nutritionPlan,
        meals: mealsWithFoods,
      },
      profile,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching nutrition plan:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}