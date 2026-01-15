# 🎯 Study Planner API Documentation

## Agentic AI Study Planner - Complete API Reference

All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

Base URL: `http://localhost:5001/api/study`

---

## 📋 **Endpoints Overview**

| Method | Endpoint | Description | Agent(s) Used |
|--------|----------|-------------|---------------|
| POST | `/goals` | Create complete study plan | All 4 agents |
| GET | `/goals/:id` | Get goal details | - |
| GET | `/goals/:id/tasks` | Get all tasks for goal | - |
| GET | `/plans/:goalId` | Get schedule for goal | - |
| PATCH | `/tasks/:id` | Update task status | - |
| POST | `/reflect/:goalId` | Trigger plan adjustment | Reflection Agent |
| GET | `/insights` | Get user memory/patterns | - |
| GET | `/next-task` | Get AI recommendation | Priority Scorer |

---

## 🚀 **1. Create Study Plan** (Main Feature!)

**Endpoint:** `POST /api/study/goals`

**What it does:**
- Analyzes goal using Goal Analyzer Agent
- Breaks down into tasks using Task Decomposer Agent
- Scores priorities using Priority Scorer Agent
- Creates schedule using Scheduler Agent
- Saves everything to MongoDB

**Request Body:**
```json
{
  "goalText": "Learn JavaScript basics in 2 weeks",
  "preferences": {
    "hoursPerDay": 4,
    "preferredTimes": ["morning", "evening"],
    "bufferTimePercent": 20,
    "startDate": "2026-01-08"
  }
}
```

**Response (201):**
```json
{
  "message": "Study plan created successfully",
  "goal": {
    "_id": "goal_id",
    "originalGoal": "Learn JavaScript basics in 2 weeks",
    "parsedDeadline": "in 2 weeks",
    "subject": "JavaScript programming",
    "complexity": "medium",
    "status": "active"
  },
  "tasks": [
    {
      "_id": "task_id_1",
      "description": "Learn JavaScript syntax and variables",
      "estimatedHours": 3,
      "priority": "high",
      "priorityScore": 8,
      "order": 1,
      "status": "pending"
    }
  ],
  "plan": {
    "_id": "plan_id",
    "schedule": [
      {
        "day": 1,
        "date": "2026-01-08",
        "tasks": [...],
        "totalHours": 4.5
      }
    ],
    "summary": {
      "totalDays": 5,
      "totalHours": 20,
      "tasksScheduled": 7
    }
  },
  "executionTime": 15234
}
```

---

## 📖 **2. Get Goal Details**

**Endpoint:** `GET /api/study/goals/:id`

**Response (200):**
```json
{
  "goal": {
    "_id": "goal_id",
    "originalGoal": "Learn JavaScript basics in 2 weeks",
    "subject": "JavaScript",
    "complexity": "medium",
    "status": "active"
  },
  "progress": {
    "totalTasks": 7,
    "completedTasks": 3,
    "completionRate": 43
  }
}
```

---

## 📝 **3. Get Tasks for Goal**

**Endpoint:** `GET /api/study/goals/:id/tasks`

**Response (200):**
```json
{
  "tasks": [
    {
      "_id": "task_id_1",
      "description": "Learn variables and data types",
      "priorityScore": 9,
      "priority": "high",
      "status": "completed",
      "estimatedHours": 2
    }
  ],
  "goal": {
    "id": "goal_id",
    "originalGoal": "Learn JavaScript basics",
    "subject": "JavaScript"
  }
}
```

---

## 📅 **4. Get Plan Schedule**

**Endpoint:** `GET /api/study/plans/:goalId`

**Response (200):**
```json
{
  "plan": {
    "schedule": [
      {
        "day": 1,
        "date": "2026-01-08",
        "tasks": [
          {
            "taskDescription": "Learn syntax",
            "startTime": "09:00",
            "duration": 2,
            "bufferAfter": 0.5
          }
        ],
        "totalHours": 4.5,
        "timeOfDay": "morning"
      }
    ],
    "summary": {
      "totalDays": 5,
      "totalHours": 20
    }
  }
}
```

---

## ✅ **5. Update Task Status**

**Endpoint:** `PATCH /api/study/tasks/:id`

**Request Body:**
```json
{
  "status": "completed"
}
```

**Valid statuses:** `pending`, `in-progress`, `completed`, `missed`

**Response (200):**
```json
{
  "message": "Task status updated successfully",
  "task": {
    "_id": "task_id",
    "status": "completed",
    "completedAt": "2026-01-08T10:30:00Z"
  }
}
```

---

## 🔄 **6. Trigger Reflection** (AI Adaptation!)

**Endpoint:** `POST /api/study/reflect/:goalId`

**What it does:**
- Analyzes what tasks were completed/missed
- Identifies patterns (e.g., "user works better in evenings")
- Adjusts plan priorities and buffer time
- Updates user memory

**Response (200):**
```json
{
  "message": "Reflection completed and plan adjusted",
  "analysis": {
    "whyTasksMissed": "Time estimates were too optimistic",
    "identifiedPatterns": ["evening_productivity", "monday_struggles"],
    "userTendency": "procrastinator"
  },
  "insights": [
    "User completes 80% more tasks in evening",
    "Consider increasing buffer time by 30%"
  ],
  "adjustmentsMade": {
    "recommendedBufferPercent": 30,
    "priorityChanges": [
      {
        "taskId": "task_id",
        "newPriority": 9,
        "reason": "Blocking other tasks"
      }
    ]
  },
  "updatedPlan": { ... }
}
```

---

## 💡 **7. Get User Insights**

**Endpoint:** `GET /api/study/insights`

**Response (200):**
```json
{
  "memory": {
    "completionRate": 75,
    "preferredTimes": ["evening", "afternoon"],
    "missedTaskPatterns": {
      "tendency": "procrastinator",
      "commonIssues": ["morning tasks", "monday sessions"]
    },
    "insights": [
      "User completes tasks better after 6pm",
      "Short tasks (1-2h) have 90% completion rate"
    ],
    "lastUpdated": "2026-01-08T12:00:00Z"
  },
  "statistics": {
    "totalTasks": 50,
    "completedTasks": 38,
    "missedTasks": 7,
    "inProgressTasks": 3,
    "pendingTasks": 2
  }
}
```

---

## 🎯 **8. Get Next Task Recommendation**

**Endpoint:** `GET /api/study/next-task?goalId=<optional>`

**What it does:**
- Uses Priority Scorer Agent
- Recommends highest priority pending task
- Considers dependencies and user patterns

**Response (200):**
```json
{
  "nextTask": {
    "_id": "task_id",
    "description": "Practice array methods and loops",
    "priorityScore": 9,
    "estimatedHours": 2,
    "order": 3
  },
  "totalPending": 4,
  "recommendation": "Focus on: Practice array methods and loops (Priority Score: 9/10)"
}
```

---

## 🔐 **Authentication**

All endpoints require JWT token from login:

```bash
# 1. Login first
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "password123"
}

# Response includes token
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}

# 2. Use token in subsequent requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📊 **Complete User Flow Example**

```bash
# Step 1: Create study plan
POST /api/study/goals
{
  "goalText": "Prepare for JavaScript interview in 1 week",
  "preferences": {
    "hoursPerDay": 5,
    "preferredTimes": ["evening"]
  }
}
# → Returns: goal, tasks, schedule

# Step 2: Get next task recommendation
GET /api/study/next-task?goalId=<goal_id>
# → Returns: "Focus on closures and scope"

# Step 3: Mark task as in-progress
PATCH /api/study/tasks/<task_id>
{ "status": "in-progress" }

# Step 4: Complete task
PATCH /api/study/tasks/<task_id>
{ "status": "completed" }

# Step 5: After several tasks, trigger reflection
POST /api/study/reflect/<goal_id>
# → AI analyzes progress, adjusts plan

# Step 6: Check insights
GET /api/study/insights
# → See learning patterns and completion rate
```

---

## 🎨 **Error Responses**

**400 Bad Request:**
```json
{
  "message": "Invalid task status"
}
```

**404 Not Found:**
```json
{
  "message": "Goal not found"
}
```

**500 Internal Server Error:**
```json
{
  "message": "Internal server error",
  "error": "Detailed error message"
}
```

---

## 🚀 **Testing with cURL**

```bash
# Set your JWT token
TOKEN="your_jwt_token_here"

# Create study plan
curl -X POST http://localhost:5001/api/study/goals \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "goalText": "Learn React in 2 weeks",
    "preferences": {
      "hoursPerDay": 4
    }
  }'

# Get next task
curl -X GET http://localhost:5001/api/study/next-task \
  -H "Authorization: Bearer $TOKEN"

# Update task status
curl -X PATCH http://localhost:5001/api/study/tasks/TASK_ID \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "completed"}'
```

---

## 🎯 **Key Features Showcased**

1. ✅ **Auto task generation** - Task Decomposer Agent
2. ✅ **Priority scoring** - Priority Scorer Agent (1-10 scores)
3. ✅ **Plan adjustment** - Reflection Agent adapts based on progress
4. ✅ **Long-term memory** - Tracks user patterns and habits
5. ✅ **Daily schedule generation** - Scheduler Agent creates day-by-day plan
6. ✅ **AI-powered recommendations** - Next task suggestions

**Perfect for resume:** Shows autonomous multi-agent AI system! 🚀
