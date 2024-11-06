export type Profile = {
    id: string;
    name: string;
    age: number;
    gender: "Male" | "Female" | "Prefer Not To Say";
    height: number;
    currentWeight: number;
    branch:
      | 'Army'
      | 'Navy'
      | 'Air Force'
      | 'Marines'
      | 'Coast Guard'
      | 'Space Force';
    currentInstallation?: string;
    activityLevel: string;
    fitnessWaivers: string;
    dietaryRestrictions: string;
    fitnessGoals?: string;
    nutritionGoals?: string;
    fitnessPreferences?: string;
    diningFacilityUsage?: number;
    onBaseRestaurantUsage?: number;
    offBaseRestaurantUsage?: number;
    homeCookingFrequency?: number;
  };