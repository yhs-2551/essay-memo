-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Memos Table
create table public.memos (
  id uuid not null default uuid_generate_v4(),
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint memos_pkey primary key (id)
);

-- Blog Posts Table
create table public.posts (
  id uuid not null default uuid_generate_v4(),
  title text not null,
  content text not null, -- The user's writing
  mode text not null default 'standard', -- 'standard' or 'consultation'
  is_published boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,

  constraint posts_pkey primary key (id)
);

-- AI Consultations Table (One-to-One with Posts)
create table public.consultations (
  id uuid not null default uuid_generate_v4(),
  post_id uuid not null references public.posts(id) on delete cascade,
  analysis text not null, -- The AI's response/proposal
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint consultations_pkey primary key (id)
);

-- Enable RLS (Row Level Security)
alter table public.memos enable row level security;
alter table public.posts enable row level security;
alter table public.consultations enable row level security;

-- Policies (For simplicity in this demo, strict RLS is disabled or open)
-- In production, you'd integrate Auth. For now, we allow anon access if configured, 
-- or you can disable RLS if you want purely backend-driven access (which Hono will handle).
-- Hono will use the service_role key or we assume anon access for the demo.
create policy "Allow public access for memos" on public.memos for all using (true);
create policy "Allow public access for posts" on public.posts for all using (true);
create policy "Allow public access for consultations" on public.consultations for all using (true);

-- User Profiles (For Consultation Limits)
create table public.profiles (
  user_id text not null, -- Stores the Cookie-based UUID
  consultation_count integer not null default 0,
  is_subscribed boolean not null default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  constraint profiles_pkey primary key (user_id)
);

alter table public.profiles enable row level security;
create policy "Allow public access for profiles" on public.profiles for all using (true);
