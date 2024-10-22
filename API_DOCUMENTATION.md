# Workout and Nutrition API Documentation

This document provides an overview of the API endpoints and how to use them securely with authentication.

## Authentication

All endpoints require authentication using a JWT token. Include the token in the `Authorization` header of your requests:

```
Authorization: Bearer YOUR_JWT_TOKEN
```

To obtain a JWT token, use Supabase's authentication system when the user logs in.

## API Endpoints


## 1. User Management

### Create a User

Create a new user account. Passwords are securely hashed before being stored in the database.

```javascript
POST /api/create-user

const userData = {
  email: 'john.doe@example.com',
  username: 'john_doe',
  password: 'securePassword123' // This will be hashed and stored securely
};

const response = await fetch('/api/user', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(userData)
});

if (response.ok) {
  const result = await response.json();
  console.log('User created:', result);
} else if (response.status === 400) {
  console.error('User with this email already exists');
} else {
  console.error('Failed to create user');
}
```
### 2. User Profile

#### Get User Profile

```javascript
GET /api/profile

const response = await fetch('/api/profile', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const profile = await response.json();
  console.log(profile);
} else {
  console.error('Failed to fetch profile');
}
```


#### Update User Profile

```javascript
POST /api/profile

const profileData = {
  name: 'John Doe',
  age: 30,
  height: 180,
  weight: 75,
  branch: 'Army',
  fitnessGoals: 'Improve endurance',
  // ... other profile fields
};

const response = await fetch('/api/profile', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(profileData)
});

if (response.ok) {
  const updatedProfile = await response.json();
  console.log(updatedProfile);
} else {
  console.error('Failed to update profile');
}
```

### 3. Workout Plan

#### Generate Workout Plan

```javascript
POST /api/workout-plan

const workoutPlanRequest = {
  goal: 'strength',
  duration: 4,
  branch: 'Army'
};

const response = await fetch('/api/workout-plan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(workoutPlanRequest)
});

if (response.ok) {
  const workoutPlan = await response.json();
  console.log(workoutPlan);
} else {
  console.error('Failed to generate workout plan');
}
```

#### Get Current Workout Plan

```javascript
GET /api/workout-plan

const response = await fetch('/api/workout-plan', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const workoutPlan = await response.json();
  console.log(workoutPlan);
} else {
  console.error('Failed to fetch workout plan');
}
```

#### Update Daily Workout

```javascript
PUT /api/workout-plan/{date}

const date = '2023-05-15';
const exercisesUpdate = [
  {
    name: 'Push-ups',
    completed: true,
    difficulty: 'just-right'
  },
  // ... other exercises
];

const response = await fetch(`/api/workout-plan/${date}`, {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ exercises: exercisesUpdate })
});

if (response.ok) {
  const updatedWorkout = await response.json();
  console.log(updatedWorkout);
} else {
  console.error('Failed to update daily workout');
}
```

### 4. Nutrition Plan

#### Generate Nutrition Plan

```javascript
POST /api/nutrition-plan

const nutritionPlanRequest = {
  goal: 'weight_loss',
  dietaryRestrictions: ['vegetarian', 'lactose-free']
};

const response = await fetch('/api/nutrition-plan', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(nutritionPlanRequest)
});

if (response.ok) {
  const nutritionPlan = await response.json();
  console.log(nutritionPlan);
} else {
  console.error('Failed to generate nutrition plan');
}
```

#### Get Current Nutrition Plan

```javascript
GET /api/nutrition-plan

const response = await fetch('/api/nutrition-plan', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

if (response.ok) {
  const nutritionPlan = await response.json();
  console.log(nutritionPlan);
} else {
  console.error('Failed to fetch nutrition plan');
}
```

### Error Handling

All endpoints return appropriate HTTP status codes:

- 200: Successful GET request
- 201: Successful POST request (resource created)
- 400: Bad request (e.g., missing required fields)
- 401: Unauthorized (invalid or missing token)
- 404: Resource not found
- 500: Internal server error

Always check the `response.ok` property and handle errors appropriately in your client-side code.

## Security Considerations

1. Always use HTTPS to encrypt data in transit.
2. Never store the JWT token in local storage. Use secure HTTP-only cookies or in-memory storage.
3. Implement token refresh mechanisms to maintain user sessions securely.
4. Validate and sanitize all user inputs on both client and server sides.

This API documentation provides a comprehensive guide for developers to interact with the Workout and Nutrition API securely. It includes examples of how to make authenticated requests to each endpoint, handle responses, and manage errors.