import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { authMiddleware } from '@/middleware/auth';
import { Profile } from '@/app/types/profile';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function GET(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    name: data.name,
    age: data.age,
    height: data.height,
    gender: data.gender,
    currentWeight: data.current_weight,
    branch: data.branch,
    currentInstallation: data.current_installation,
    activityLevel: data.activity_level,
    fitnessWaivers: data.fitness_waivers,
    dietaryRestrictions: data.dietary_restrictions,
    fitnessGoals: data.fitness_goals,
    nutritionGoals: data.nutrition_goals,
    fitnessPreferences: data.fitness_preferences,
    diningFacilityUsage: data.dining_facility_usage,
    onBaseRestaurantUsage: data.on_base_restaurant_usage,
    offBaseRestaurantUsage: data.off_base_restaurant_usage,
    homeCookingFrequency: data.home_cooking_frequency,
  });
}

export async function PUT(request: Request) {
  const authResponse = await authMiddleware(request);
  if (authResponse.status !== 200) return authResponse;

  const user = (request as any).user;
  const profileData: Profile = await request.json();

  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: profileData.name,
      age: profileData.age,
      height: profileData.height,
      gender: profileData.gender,
      current_weight: profileData.currentWeight,
      branch: profileData.branch,
      current_installation: profileData.currentInstallation,
      activity_level: profileData.activityLevel,
      fitness_waivers: profileData.fitnessWaivers,
      dietary_restrictions: profileData.dietaryRestrictions,
      fitness_goals: profileData.fitnessGoals,
      nutrition_goals: profileData.nutritionGoals,
      fitness_preferences: profileData.fitnessPreferences,
      dining_facility_usage: profileData.diningFacilityUsage,
      on_base_restaurant_usage: profileData.onBaseRestaurantUsage,
      off_base_restaurant_usage: profileData.offBaseRestaurantUsage,
      home_cooking_frequency: profileData.homeCookingFrequency,
    })
    .eq('user_id', user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

