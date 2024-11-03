export type Profile = {
    id: string;
    name: string;
    age: number;
    height: number;
    weight: number;
    branch:
      | 'Army'
      | 'Navy'
      | 'Air Force'
      | 'Marines'
      | 'Coast Guard'
      | 'Space Force';
    currentInstallation?: string;
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