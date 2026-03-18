-- Verdant Plant — Supabase Database Schema
-- Run this in your Supabase SQL editor

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- Users
create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  wallet_address text,
  plan text default 'free' check (plan in ('free', 'pro')),
  created_at timestamptz default now()
);

-- Plants
create table if not exists plants (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  name text not null,
  species text,
  growth_stage text default 'vegetative'
    check (growth_stage in ('seedling', 'vegetative', 'flowering', 'fruiting')),
  care_preset text default 'tropical'
    check (care_preset in ('tropical', 'temperate', 'desert', 'mediterranean')),
  mqtt_topic text unique,
  created_at timestamptz default now()
);

-- Sensor readings
create table if not exists sensor_readings (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id) on delete cascade,
  temperature float,
  humidity float,
  soil_moisture float,
  light_level float,
  co2 float,
  recorded_at timestamptz default now()
);

-- AI analyses
create table if not exists ai_analyses (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id) on delete cascade,
  status text check (status in ('healthy', 'warning', 'critical')),
  reasoning text,
  actions_taken jsonb default '[]',
  raw_response text,
  created_at timestamptz default now()
);

-- Actions log
create table if not exists actions_log (
  id uuid primary key default gen_random_uuid(),
  plant_id uuid references plants(id) on delete cascade,
  action_type text not null,
  duration integer,
  triggered_by text default 'ai' check (triggered_by in ('ai', 'manual')),
  executed_at timestamptz default now()
);

-- Treasury log (public read)
create table if not exists treasury_log (
  id uuid primary key default gen_random_uuid(),
  amount_sol float,
  amount_usd float,
  tx_signature text,
  type text check (type in ('inflow', 'outflow')),
  description text,
  created_at timestamptz default now()
);

-- Indexes for performance
create index if not exists idx_sensor_readings_plant_id on sensor_readings(plant_id);
create index if not exists idx_sensor_readings_recorded_at on sensor_readings(recorded_at desc);
create index if not exists idx_ai_analyses_plant_id on ai_analyses(plant_id);
create index if not exists idx_actions_log_plant_id on actions_log(plant_id);

-- Row Level Security
alter table users enable row level security;
alter table plants enable row level security;
alter table sensor_readings enable row level security;
alter table ai_analyses enable row level security;
alter table actions_log enable row level security;

-- Treasury is public read
alter table treasury_log enable row level security;
create policy "Treasury is public read"
  on treasury_log for select using (true);
