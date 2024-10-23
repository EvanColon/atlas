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
        enum: ["strength", "endurance", "weight_loss", "general_fitness"],
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
    required: ["startDate", "endDate", "workoutPlan"]
  }
};

export const nutritionPlanFunction = {
  name: "generate_nutrition_plan",
  description: "Generate a nutrition plan based on user profile",
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
                  calories: { type: "integer", minimum: 0 },
                  protein: { type: "integer", minimum: 0 },
                  carbs: { type: "integer", minimum: 0 },
                  fat: { type: "integer", minimum: 0 },
                  foods: {
                    type: "array",
                    items: { 
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        amount: { type: "string" },
                        calories: { type: "integer", minimum: 0 },
                        protein: { type: "integer", minimum: 0 },
                        carbs: { type: "integer", minimum: 0 },
                        fat: { type: "integer", minimum: 0 },
                      },
                      required: ["name", "amount", "calories", "protein", "carbs", "fat"]
                    }
                  }
                },
                required: ["name", "calories", "protein", "carbs", "fat", "foods"]
              }
            },
            totalCalories: { type: "integer", minimum: 0 },
            totalProtein: { type: "integer", minimum: 0 },
            totalCarbs: { type: "integer", minimum: 0 },
            totalFat: { type: "integer", minimum: 0 }
          },
          required: ["day", "meals", "totalCalories", "totalProtein", "totalCarbs", "totalFat"]
        }
      }
    },
    required: ["startDate", "endDate", "weeklyPlan"]
  }
};

export async function generateWorkoutPlan(userProfile: any, startDate: string, endDate: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a professional trainer." },
      { role: "user", content: `Generate a workout plan from ${startDate} to ${endDate} based on these user profile parameters: ${JSON.stringify(userProfile)}. Include daily workouts with exercises, sets, reps, and durations.` }
    ],
    functions: [workoutPlanFunction],
    function_call: { name: "generate_workout_plan" }
  });

  return JSON.parse(completion.choices[0].message.function_call?.arguments || "{}");
}

export async function generateNutritionPlan(userProfile: any) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: "You are a professional nutritionist." },
      { role: "user", content: `Generate a nutrition plan based on these user profile parameters: ${JSON.stringify(userProfile)}. Include daily meals with foods, amounts, and calorie counts.` }
    ],
    functions: [nutritionPlanFunction],
    function_call: { name: "generate_nutrition_plan" }
  });

  return JSON.parse(completion.choices[0].message.function_call?.arguments || "{}");
}

