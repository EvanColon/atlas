interface NutritionData {
  name: string;
  portion: string;
  calories: string;
  description: string;
  allergens: string;
  nutritionalInfo: {
    totalFat: string;
    saturatedFat: string;
    protein: string;
    carbohydrates: string;
    // ... add other nutritional fields as needed
  };
}

interface MenuItem {
  id: string;
  name: string;
  nutrition: NutritionData;
}

interface MenuResponse {
  title: string;
  startDate: string;
  endDate: string;
  menus: {
    title: string;
    days: Array<{
      day: string;
      meals: Array<{
        title: string;
        categories: Array<{
          title: string;
          items: Array<{
            id: string;
            name: string;
            nutrition: {
              portion: string;
              calories: string;
              description: string;
              allergens: string;
              nutritionalInfo: {
                totalFat: string;
                saturatedFat: string;
                protein: string;
                carbohydrates: string;
              };
            };
          }>;
        }>;
      }>;
    }>;
  }[];
}

interface SimplifiedMenuItem {
  id: string;
  name: string;
  calories: string;
  portion: string;
  allergens: string;
}

interface SimplifiedMenuResponse {
  title: string;
  startDate: string;
  endDate: string;
  menus: Array<{
    title: string;
    days: Array<{
      day: string;
      meals: Array<{
        title: string;
        categories: Array<{
          title: string;
          items: SimplifiedMenuItem[];
        }>;
      }>;
    }>;
  }>;
}

interface DayMealResponse {
  title: string;
  date: string;
  meal: {
    title: string;
    categories: Array<{
      title: string;
      items: SimplifiedMenuItem[];
    }>;
  };
}

interface CacheEntry {
  data: DayMealResponse | null;
  timestamp: number;
  key: string;
}

const menuCache: Map<string, CacheEntry> = new Map();
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function fetchDiningFacilityData(day?: string, mealTime?: string): Promise<DayMealResponse | null> {
  // Create a cache key based on the day and mealTime
  const cacheKey = `${day || 'all'}-${mealTime || 'all'}`;
  
  // Check cache first
  const cached = menuCache.get(cacheKey);
  const currentTime = Date.now();
  
  if (cached && (currentTime - cached.timestamp) < CACHE_DURATION) {
    console.log("Returning cached menu data");
    return cached.data;
  }

  // If not in cache or expired, fetch new data
  console.log("Fetching fresh menu data");
  
  console.log("fetchDiningFacilityData", day, mealTime);
  // Get the current date
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

  // Calculate the previous Monday or use the current date if today is Monday
  const previousMonday = new Date(now);
  if (dayOfWeek === 1) {
    // Today is Monday, use today
    previousMonday.setHours(0, 0, 0, 0); // Reset time to midnight
  } else {
    // Calculate the previous Monday
    const daysSinceMonday = (dayOfWeek + 6) % 7; // Days since last Monday
    previousMonday.setDate(now.getDate() - daysSinceMonday);
    previousMonday.setHours(0, 0, 0, 0); // Reset time to midnight
  }

  // Format date as MM-DD-YYYY
  const fetchMonth = String(previousMonday.getMonth() + 1).padStart(2, '0');
  const fetchDay = String(previousMonday.getDate()).padStart(2, '0');
  const fetchYear = previousMonday.getFullYear();
  const fetchTime = new Date().toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: true // Ensure 12-hour format
  });
  const formattedDate = `${fetchMonth}-${fetchDay}-${fetchYear}`;
  const formattedTime = `${fetchMonth}/${fetchDay}/${fetchYear} ${fetchTime}`;

  console.log("formattedDate", formattedDate);
  console.log("formattedTime", formattedTime);
  const fetchUrl = `https://usafdining-vandenberg.catertrax.com/upload/606_breakers_${formattedDate}_one-week_Mon-Sun.json?time=${encodeURIComponent(formattedTime)}`
  console.log("fetchUrl", fetchUrl);

  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      throw new Error('Failed to fetch dining facility data', { cause: response });
    }
    
    // Get the response text
    const responseText = await response.text();
    console.log("Full response length:", responseText.length);
    
    // Extract menuData array
    const menuDataMatch = responseText.match(/menuData\s*=\s*(\[[\s\S]*?\]);/);
    if (!menuDataMatch || !menuDataMatch[1]) {
      throw new Error('Could not find menu data in response');
    }
    
    // Parse the menu data
    const menuData = JSON.parse(menuDataMatch[1]);
    console.log("menuData length:", JSON.stringify(menuData).length);
    
    // Extract aData (nutrition information)
    const nutritionData: Record<string, string[]> = {};
    const regex = /aData\['([^']+)'\]\s*=\s*new Array\(([\s\S]*?)\);/g;
    let match;
    
    while ((match = regex.exec(responseText)) !== null) {
      const [_, id, valuesStr] = match;
      const values = valuesStr.split(',').map(val => 
        val.trim().replace(/^"|"$/g, '').replace(/^'|'$/g, '')
      );
      nutritionData[id] = values;
    }
    console.log("nutritionData length:", JSON.stringify(nutritionData).length);

    // Combine menu and nutrition data
    const processedMenu = processMenuData(menuData[0], nutritionData);
    console.log("processedMenu length:", JSON.stringify(processedMenu).length);
    
    // If no day/meal specified, return the full menu
    if (!day || !mealTime) {
      // Convert SimplifiedMenuResponse to DayMealResponse format
      return {
        title: processedMenu.title,
        date: processedMenu.startDate,
        meal: {
          title: "All Meals",
          categories: processedMenu.menus[0].days[0].meals[0].categories
        }
      };
    }

    // Find the specified day
    const selectedDay = processedMenu.menus[0].days.find(
      d => d.day.toLowerCase() === day.toLowerCase()
    );

    if (!selectedDay) {
      return null;
    }

    // Find the specified meal
    const selectedMeal = selectedDay.meals.find(
      m => m.title.toLowerCase() === mealTime.toLowerCase()
    );

    if (!selectedMeal) {
      return null;
    }

    // Return just the specific day and meal
    const result = {
      title: processedMenu.title,
      date: selectedDay.day,
      meal: {
        title: selectedMeal.title,
        categories: selectedMeal.categories
      }
    };

    menuCache.set(cacheKey, {
      data: result,
      timestamp: currentTime,
      key: cacheKey
    });

    return result;
  } catch (error) {
    console.error('Error fetching dining facility data:', error);
    throw new Error('Internal server error');
  }
}

function processMenuData(menuData: any, nutritionData: Record<string, string[]>): SimplifiedMenuResponse {
  const processGroups = (groups: any[]) => {
    return groups.map(group => ({
      title: group.title,
      categories: group.category.map((cat: any) => ({
        title: cat.title,
        items: cat.products.map((productId: string) => {
          const nutrition = nutritionData[productId];
          if (!nutrition) return null;
          
          return {
            id: productId,
            name: nutrition[22], // Name is at index 22
            calories: nutrition[1],
            portion: nutrition[0],
            allergens: nutrition[24]
          };
        }).filter(Boolean)
      }))
    }));
  };

  return {
    title: menuData.title,
    startDate: menuData.startdate,
    endDate: menuData.enddate,
    menus: menuData.menus.map((menu: any) => ({
      title: menu.title,
      days: menu.tabs.map((tab: any) => ({
        day: tab.title,
        meals: processGroups(tab.groups)
      }))
    }))
  };
}