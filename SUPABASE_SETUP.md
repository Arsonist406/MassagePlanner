# SUPABASE_SETUP.md

## Supabase Database Setup for Massage Planner

This guide will help you set up the required Supabase database tables for the Massage Planner application.

### Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Enter project details:
   - **Name**: massage-planner (or any name you prefer)
   - **Database Password**: Choose a strong password
   - **Region**: Select closest to your location
5. Wait for the project to be created (~2 minutes)

### Step 2: Run SQL Setup Script

1. In your Supabase project dashboard, go to **SQL Editor** (left sidebar)
2. Click **"New Query"**
3. Copy and paste the following SQL script:

```sql
-- =====================================================
-- MASSAGE PLANNER DATABASE SCHEMA
-- =====================================================

-- Drop existing tables if they exist (for clean setup)
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS breaks CASCADE;

-- =====================================================
-- CREATE TABLES
-- =====================================================

-- Appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'appointment' CHECK (type = 'appointment'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Breaks table
CREATE TABLE breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'break' CHECK (type = 'break'),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- CREATE INDEXES
-- =====================================================

-- Indexes for better query performance
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_appointments_end_time ON appointments(end_time);
CREATE INDEX idx_breaks_start_time ON breaks(start_time);
CREATE INDEX idx_breaks_end_time ON breaks(end_time);

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- CREATE POLICIES (No Auth Required - Private Use)
-- =====================================================

-- Allow all operations on appointments
CREATE POLICY "Allow all operations on appointments" 
ON appointments
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Allow all operations on breaks
CREATE POLICY "Allow all operations on breaks" 
ON breaks
FOR ALL 
USING (true) 
WITH CHECK (true);

-- =====================================================
-- CREATE FUNCTIONS
-- =====================================================

-- Function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for auto-updating updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breaks_updated_at
  BEFORE UPDATE ON breaks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- OPTIONAL: INSERT SAMPLE DATA
-- =====================================================

-- Uncomment the following lines to insert sample data for testing


-- Sample appointment 1
INSERT INTO appointments (client_name, start_time, duration_minutes, end_time, type)
VALUES (
  'John Doe',
  (CURRENT_DATE + INTERVAL '10 hours')::TIMESTAMPTZ,
  60,
  (CURRENT_DATE + INTERVAL '11 hours')::TIMESTAMPTZ,
  'appointment'
);

-- Sample appointment 2
INSERT INTO appointments (client_name, start_time, duration_minutes, end_time, type)
VALUES (
  'Jane Smith',
  (CURRENT_DATE + INTERVAL '12 hours')::TIMESTAMPTZ,
  90,
  (CURRENT_DATE + INTERVAL '13 hours 30 minutes')::TIMESTAMPTZ,
  'appointment'
);

-- Sample appointment 3
INSERT INTO appointments (client_name, start_time, duration_minutes, end_time, type)
VALUES (
  'Bob Johnson',
  (CURRENT_DATE + INTERVAL '15 hours')::TIMESTAMPTZ,
  60,
  (CURRENT_DATE + INTERVAL '16 hours')::TIMESTAMPTZ,
  'appointment'
);

-- Sample break
INSERT INTO breaks (start_time, duration_minutes, end_time, type)
VALUES (
  (CURRENT_DATE + INTERVAL '14 hours')::TIMESTAMPTZ,
  15,
  (CURRENT_DATE + INTERVAL '14 hours 15 minutes')::TIMESTAMPTZ,
  'break'
);

```

4. Click **"Run"** to execute the SQL script
5. You should see "Success. No rows returned" message

### Step 3: Get Your Supabase Credentials

1. In your Supabase dashboard, go to **Settings** > **API** (left sidebar)
2. Find these two values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon public key**: A long string starting with `eyJ...`

### Step 4: Configure Your Application

1. Create a `.env` file in your project root (if not already created)
2. Add your Supabase credentials:

```env
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

3. **Important**: Never commit the `.env` file to Git. It's already in `.gitignore`.

### Step 5: Verify Setup

1. Start your application:
   ```powershell
   npm run dev
   ```

2. Try creating an appointment - it should save to Supabase

3. Verify in Supabase:
   - Go to **Table Editor** in Supabase dashboard
   - Select `appointments` table
   - You should see your test appointment

## Troubleshooting

### "Failed to load schedule" Error

- **Check**: Environment variables are set correctly in `.env`
- **Check**: Supabase project URL and anon key are correct
- **Check**: Tables were created successfully (verify in Table Editor)

### "Failed to create appointment" Error

- **Check**: Row Level Security policies are enabled
- **Check**: SQL script ran without errors
- **Check**: Network connection to Supabase

### Can't See Data in Table Editor

- **Check**: You created the appointment successfully (no error message)
- **Check**: You're looking at the correct table (`appointments` or `breaks`)
- **Refresh**: The Table Editor page

## Security Notes

Since this is a private, personal-use application:

- ✅ **No authentication required** - Anyone with the URL can access
- ✅ **RLS enabled but permissive** - All operations allowed
- ⚠️ **For production/public use**: Implement proper authentication and restrictive RLS policies
- ⚠️ **Never expose your `VITE_SUPABASE_ANON_KEY`** in public repositories

## Next Steps

Once your database is set up:

1. ✅ Run the application: `npm run dev`
2. ✅ Test creating/editing/deleting appointments
3. ✅ Test the auto-insert breaks feature
4. ✅ Test drag-and-drop functionality
5. ✅ Deploy to Netlify (see README.md)

## Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript/introduction)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
