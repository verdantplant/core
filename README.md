# ⚙️ Verdant Plant — Core Backend

> AI analysis service, MQTT listener, REST API, and treasury management for Verdant Plant.

**[verdantplant.xyz](https://verdantplant.xyz)** · [@verdantplant](https://twitter.com/verdantplant) · [t.me/verdantplant](https://t.me/verdantplant)

---

## Architecture

```
Hardware (ESP32 / Raspberry Pi)
        │
        │ MQTT publish: verdantplant/{plant_id}/sensors
        ▼
   HiveMQ Cloud Broker
        │
        │ subscribe
        ▼
  MQTT Listener Service ──► Supabase (PostgreSQL)
        │                         │
        │ trigger analysis         │ fetch plant profile
        ▼                         │ + sensor history
   AI Analysis Service ◄──────────┘
        │
        │ Claude API (claude-sonnet-4-5)
        │
        ▼
   Parse AI response
        │
        ├──► Save to Supabase (ai_analyses table)
        │
        └──► MQTT publish: verdantplant/{plant_id}/actions
                    │
                    ▼
             Hardware executes
             (pump / light / fan)
```

## Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js 20+ |
| Database | Supabase (PostgreSQL) |
| MQTT Broker | HiveMQ Cloud |
| AI Engine | Claude API (Anthropic) |
| REST API | Express.js |
| Hosting | Railway.app |
| Auth | Supabase Auth |

## Project Structure

```
core/
├── src/
│   ├── mqtt/
│   │   ├── listener.js        # Subscribe to sensor topics
│   │   └── publisher.js       # Publish action commands
│   ├── ai/
│   │   ├── analyzer.js        # Claude API integration
│   │   ├── prompt.js          # System prompt builder
│   │   └── scheduler.js       # Analysis interval manager
│   ├── api/
│   │   ├── index.js           # Express app setup
│   │   ├── plants.js          # Plants CRUD endpoints
│   │   ├── sensors.js         # Sensor data endpoints
│   │   ├── actions.js         # Hardware action endpoints
│   │   └── treasury.js        # Treasury public endpoints
│   └── db/
│       ├── client.js          # Supabase client
│       └── schema.sql         # Database schema
├── .env.example
├── package.json
└── README.md
```

## Database Schema

```sql
-- Users
create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  wallet_address text,
  plan text default 'free',
  created_at timestamptz default now()
);

-- Plants
create table plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  name text not null,
  species text,
  growth_stage text default 'vegetative',
  care_preset text default 'tropical',
  mqtt_topic text unique,
  created_at timestamptz default now()
);

-- Sensor readings
create table sensor_readings (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id),
  temperature float,
  humidity float,
  soil_moisture float,
  light_level float,
  co2 float,
  recorded_at timestamptz default now()
);

-- AI analyses
create table ai_analyses (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id),
  status text,
  reasoning text,
  actions_taken jsonb,
  raw_response text,
  created_at timestamptz default now()
);

-- Actions log
create table actions_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id),
  action_type text not null,
  duration integer,
  triggered_by text default 'ai',
  executed_at timestamptz default now()
);

-- Treasury
create table treasury_log (
  id uuid primary key default gen_random_uuid(),
  amount_sol float,
  amount_usd float,
  tx_signature text,
  type text,
  description text,
  created_at timestamptz default now()
);
```

## Environment Variables

```bash
# .env — copy from .env.example
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=your_service_key

ANTHROPIC_API_KEY=sk-ant-xxx

MQTT_BROKER_URL=ssl://xxx.hivemq.cloud:8883
MQTT_USERNAME=your_username
MQTT_PASSWORD=your_password

PORT=3000
```

## API Endpoints

```
GET    /plants                     List all plants
POST   /plants                     Create plant
GET    /plants/:id                 Plant detail
DELETE /plants/:id                 Delete plant

GET    /plants/:id/sensors         Sensor history
POST   /plants/:id/sensors         Submit sensor data (HTTP alt to MQTT)

POST   /plants/:id/actions         Send hardware command
POST   /plants/:id/analyze         Trigger manual AI analysis
GET    /plants/:id/logs            Care log timeline

GET    /treasury                   Treasury balance (public)
GET    /treasury/transactions      Transaction history (public)
```

## AI Prompt Structure

Every analysis sends this to Claude:

```
System:
You are an autonomous plant care AI for Verdant Plant.
Analyze the sensor data and return ONLY a valid JSON object:
{
  "status": "healthy | warning | critical",
  "reasoning": "brief explanation of current conditions",
  "actions": [{"action": "water|light_on|light_off|fan_on|fan_off|heater_on|heater_off", "duration": seconds}],
  "next_check_minutes": 15-60
}

User:
Plant: {name} ({species})
Stage: {growth_stage} | Preset: {care_preset}
Sensor data: temp={temperature}°C, humidity={humidity}%, soil={soil_moisture}%, light={light_level}lux
Last watered: {X} hours ago | Last action: {last_action}
Time of day: {HH:MM}
```

## Getting Started

```bash
# Install
git clone https://github.com/verdantplant/core
cd core
npm install

# Setup env
cp .env.example .env
# Fill in your credentials

# Run locally
npm run dev

# Deploy to Railway
# Connect repo at railway.app — auto-deploys on push
```

## Status

🚧 **Under active development** — building in public.

Follow progress: [@verdantplant](https://twitter.com/verdantplant)

## License

MIT
