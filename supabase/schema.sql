-- ResultadoYa — Supabase Schema
-- Run this in the Supabase SQL Editor

-- ── Tables ────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS rooms (
  id               uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  code             text        UNIQUE NOT NULL,
  name             text        NOT NULL,
  team_home        text        NOT NULL,
  team_away        text        NOT NULL,
  max_goals        int         NOT NULL CHECK (max_goals BETWEEN 1 AND 5),
  mode             text        NOT NULL DEFAULT 'sorteo' CHECK (mode IN ('sorteo', 'pronostico')),
  status           text        NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
  entry_price      numeric     NOT NULL DEFAULT 0,
  admin_id         uuid        NOT NULL,
  admin_name       text        NOT NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  real_score_home  int,
  real_score_away  int
);

CREATE TABLE IF NOT EXISTS room_players (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id      uuid        NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  user_id      uuid        NOT NULL,
  display_name text        NOT NULL,
  avatar_url   text,
  is_guest     boolean     NOT NULL DEFAULT true,
  joined_at    timestamptz NOT NULL DEFAULT now(),
  score_home   int,
  score_away   int,
  UNIQUE (room_id, user_id)
);

-- ── Row Level Security ─────────────────────────────────────────────────────────

ALTER TABLE rooms        ENABLE ROW LEVEL SECURITY;
ALTER TABLE room_players ENABLE ROW LEVEL SECURITY;

-- rooms: anyone reads
CREATE POLICY "rooms_select" ON rooms FOR SELECT USING (true);

-- rooms: authenticated users can create (they must be the admin)
CREATE POLICY "rooms_insert" ON rooms FOR INSERT
  WITH CHECK (auth.uid() = admin_id);

-- rooms: only admin can update
CREATE POLICY "rooms_update" ON rooms FOR UPDATE
  USING (auth.uid() = admin_id);

-- room_players: anyone reads
CREATE POLICY "room_players_select" ON room_players FOR SELECT USING (true);

-- room_players: anyone can insert (guests use anon key)
CREATE POLICY "room_players_insert" ON room_players FOR INSERT WITH CHECK (true);

-- room_players: room admin can update (for sorteo draw assignment)
CREATE POLICY "room_players_update" ON room_players FOR UPDATE
  USING (
    auth.uid() = (SELECT admin_id FROM rooms WHERE rooms.id = room_players.room_id)
  );

-- room_players: room admin can delete (kick player)
CREATE POLICY "room_players_delete" ON room_players FOR DELETE
  USING (
    auth.uid() = (SELECT admin_id FROM rooms WHERE rooms.id = room_players.room_id)
  );

-- ── Realtime ──────────────────────────────────────────────────────────────────

-- Enable Realtime for both tables in Supabase Dashboard:
-- Database → Replication → Tables → enable rooms + room_players

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_rooms_code          ON rooms(code);
CREATE INDEX IF NOT EXISTS idx_room_players_room   ON room_players(room_id);
CREATE INDEX IF NOT EXISTS idx_room_players_user   ON room_players(user_id);
