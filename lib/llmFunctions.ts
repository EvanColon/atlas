import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const workoutPlanFunction = {
  name: "generate_workout_plan",
  description: "Generate a workout plan based on user profile.",
  parameters: {
    type: "object",
    properties: {
      name: {
        type: "string",
        description: "Name of the workout plan"
      },
      startDate: {
        type: "string",
        format: "date",
        description: "Start date of the workout plan"
      },
      endDate: {
        type: "string",
        format: "date",
        description: "End date of the workout plan"
      },
      workoutGoal: {
        type: "string",
        description: "Goal of the workout plan"
      },
      workoutPlan: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: {
              type: "string",
              format: "date",
              description: "Date of the workout"
            },
            summary: { type: "string" },
            duration: { type: "integer", minimum: 0 },
            caloriesBurned: { type: "integer", minimum: 0 },
            workoutType: {
              type: "string",
              enum: ["cardio", "strength", "yoga", "hiit", "rest"]
            },
            exercises: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  sets: { type: "integer", minimum: 1 },
                  reps: { type: "integer", minimum: 1 },
                  duration: { type: "integer", minimum: 1 }
                },
                required: ["name"]
              }
            }
          },
          required: ["day", "summary", "duration", "caloriesBurned", "workoutType", "exercises"]
        }
      }
    },
    required: ["name", "startDate", "endDate", "workoutGoal", "workoutPlan"]
  }
};

export const nutritionPlanFunction = {
  name: "generate_nutrition_plan",
  description: "Generate a personalized nutrition plan based on user profile and dining facility menu",
  parameters: {
    type: "object",
    properties: {
      startDate: {
        type: "string",
        format: "date",
        description: "Start date of the nutrition plan"
      },
      endDate: {
        type: "string",
        format: "date",
        description: "End date of the nutrition plan"
      },
      goal: {
        type: "string",
        enum: ["weight_loss", "muscle_gain", "maintenance", "performance"],
        description: "Goal of the nutrition plan"
      },
      dailyCalorieTarget: {
        type: "number",
        description: "Target daily calorie intake"
      },
      protein: {
        type: "number",
        description: "Target daily protein intake"
      },
      carbohydrates: {
        type: "number",
        description: "Target daily carbohydrate intake"
      },
      fat: {
        type: "number",
        description: "Target daily fat intake"
      },
      weeklyPlan: {
        type: "array",
        items: {
          type: "object",
          properties: {
            day: {
              type: "string",
              format: "date",
              description: "Date of the meal plan"
            },
            meals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  time: { type: "string" },
                  diningFacilityOptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        portion: { type: "string" },
                        calories: { type: "number" },
                        allergens: { type: "string" }
                      }
                    }
                  },
                  alternativeOptions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "string" },
                        calories: { type: "number" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    required: ["startDate", "endDate", "goal", "dailyCalorieTarget", "protein", "carbohydrates", "fat", "weeklyPlan"]
  }
};

export async function generateWorkoutPlan(userProfile: any, userInput: string, startDate: string, endDate: string) {


  
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a professional trainer." },
      { role: "user", content: `Generate a workout plan from ${startDate} to ${endDate} based on these user profile parameters: ${JSON.stringify(userProfile)}. Additional user input: ${userInput}. Include daily workouts with exercises, sets, reps, and durations.` }
    ],
    functions: [workoutPlanFunction],
    function_call: { name: "generate_workout_plan" }
  });

  return JSON.parse(completion.choices[0].message.function_call?.arguments || "{}");
}

export async function generateNutritionPlan(request: NutritionPlanRequest): Promise<NutritionPlanResponse> {
  console.log('Starting generateNutritionPlan with request:', JSON.stringify(request, null, 2));
  
  // Calculate BMR using Mifflin-St Jeor Equation
  const bmr = calculateBMR(request.personalInfo);
  console.log('Calculated BMR:', bmr);
  
  // Calculate TDEE (Total Daily Energy Expenditure)
  const activityMultipliers = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    very: 1.725,
    extra: 1.9
  };
  
  const tdee = bmr * activityMultipliers[request.personalInfo.activityLevel];
  console.log('Calculated TDEE:', tdee);
  
  // Calculate target calories based on goals
  const weeklyWeightChange = 1; // 1 pound per week is a healthy rate
  const calorieAdjustment = (request.personalInfo.currentWeight > request.personalInfo.targetWeight) ? -500 : 500;
  const dailyCalorieTarget = Math.round(tdee + calorieAdjustment);
  console.log('Daily calorie target:', dailyCalorieTarget);

  // Get dining facility menu for the week if available
  console.log('Fetching dining facility data...');
  const diningFacilityMenu = request.dietaryInfo.diningFacilityAccess ? 
    await fetchDiningFacilityData() : null;
  console.log('Dining facility menu available:', !!diningFacilityMenu);

  console.log('Making OpenAI API call...');
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { 
        role: "system", 
        content: "You are a military nutritionist specializing in personalized meal plans. All measurements are in US units (pounds, inches)."
      },
      { 
        role: "user", 
        content: `Generate a nutrition plan with these parameters:
          Personal Info: ${JSON.stringify(request.personalInfo)}
          Fitness Goals: ${JSON.stringify(request.fitnessGoals)}
          Dietary Info: ${JSON.stringify(request.dietaryInfo)}
          Daily Calorie Target: ${dailyCalorieTarget}
          Available Dining Facility Menu: ${diningFacilityMenu ? JSON.stringify(diningFacilityMenu) : 'Not available'}
          
          Consider their PT test date if provided and adjust the plan accordingly.
          If they have dining facility access, prioritize menu items that match their needs.
          Include alternative options for when dining facility access isn't available.`
      }
    ],
    functions: [nutritionPlanFunction],
    function_call: { name: "generate_nutrition_plan" }
  });

  console.log('OpenAI API response received');
  
  const result = JSON.parse(completion.choices[0].message.function_call?.arguments || "{}");
  console.log('Parsed nutrition plan result:', JSON.stringify(result, null, 2));

  return result;
}

function calculateBMR(personalInfo: NutritionPlanRequest['personalInfo']) {
  const { age, gender, height, currentWeight } = personalInfo;
  
  // Mifflin-St Jeor Equation
  if (gender.toLowerCase() === 'male') {
    return (10 * currentWeight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * currentWeight) + (6.25 * height) - (5 * age) - 161;
  }
}

import { fetchDiningFacilityData } from '@/lib/diningFacility';

export async function getDiningFacilityMenu(day: string, mealTime: string) {
  try {
    const menuData = await fetchDiningFacilityData(day, mealTime);
    return {
      success: true,
      data: menuData,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }
}

export const diningFacilityFunction = {
  name: "get_dining_facility_menu",
  description: "Fetch the dining facility's menu for a specific day and meal.",
  parameters: {
    type: "object",
    properties: {
      day: {
        type: "string",
        enum: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
        description: "Day of the week to fetch menu for"
      },
      meal: {
        type: "string",
        enum: ["Breakfast", "Lunch", "Dinner"],
        description: "Meal time to fetch menu for"
      }
    },
    required: ["day", "meal"]
  }
};

export type NutritionPlanRequest = {
  personalInfo: {
    age: number;
    gender: string;
    height: number;  // in inches
    currentWeight: number;  // in pounds
    targetWeight: number;  // in pounds
    activityLevel: 'sedentary' | 'light' | 'moderate' | 'very' | 'extra';
    ptTestDate?: string;  // ISO date string
  };
  fitnessGoals: {
    primary: 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance';
    targetWeight: number;  // in pounds
    weeklyWorkouts: number;
  };
  dietaryInfo: {
    restrictions: string[];  // e.g., ['vegetarian', 'gluten-free']
    allergies: string[];    // e.g., ['peanuts', 'shellfish']
    mealsPerDay: number;
    diningFacilityAccess: boolean;
  };
};

// Optional: Add a response type for better type safety
export type NutritionPlanResponse = {
  startDate: string;
  endDate: string;
  goal: string;
  dailyCalorieTarget: number;
  protein: number;
  carbohydrates: number;
  fat: number;
  weeklyPlan: Array<{
    day: string;
    meals: Array<{
      name: string;
      time: string;
      diningFacilityOptions: Array<{
        name: string;
        portion: string;
        calories: number;
        allergens: string;
      }>;
      alternativeOptions: Array<{
        name: string;
        amount: string;
        calories: number;
      }>;
    }>;
  }>;
};

export function transformProfileToNutritionRequest(profile: any, startDate: string, endDate: string): NutritionPlanRequest {
  return {
    personalInfo: {
      age: profile.age,
      gender: profile.gender,
      height: profile.height, // assuming height is stored in inches
      currentWeight: profile.weight, // assuming weight is stored in pounds
      targetWeight: profile.target_weight || profile.weight, // fallback to current weight if no target
      activityLevel: mapActivityLevel(profile.activity_level),
      ptTestDate: profile.next_pt_test
    },
    fitnessGoals: {
      primary: mapFitnessGoal(profile.fitness_goal),
      targetWeight: profile.target_weight || profile.weight,
      weeklyWorkouts: profile.weekly_workouts || 3
    },
    dietaryInfo: {
      restrictions: profile.dietary_restrictions || [],
      allergies: profile.food_allergies || [],
      mealsPerDay: profile.meals_per_day || 3,
      diningFacilityAccess: profile.dining_facility_access || false
    }
  };
}

function mapActivityLevel(level: string): 'sedentary' | 'light' | 'moderate' | 'very' | 'extra' {
  const activityMap: Record<string, 'sedentary' | 'light' | 'moderate' | 'very' | 'extra'> = {
    'inactive': 'sedentary',
    'light': 'light',
    'moderate': 'moderate',
    'very_active': 'very',
    'extremely_active': 'extra'
  };
  return activityMap[level] || 'moderate';
}

function mapFitnessGoal(goal: string): 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance' {
  const goalMap: Record<string, 'weight_loss' | 'muscle_gain' | 'maintenance' | 'performance'> = {
    'lose_weight': 'weight_loss',
    'gain_muscle': 'muscle_gain',
    'maintain': 'maintenance',
    'improve_performance': 'performance'
  };
  return goalMap[goal] || 'maintenance';
}