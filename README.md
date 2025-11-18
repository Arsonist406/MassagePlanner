# Massage Planner

A complete React single-page application for managing massage therapy appointments. Built with React, TypeScript, Vite, TailwindCSS, and Supabase.

## Features

- ✅ **Create Appointments**: Add client appointments with name, start time, and duration
- ✅ **Drag & Drop**: Move appointments and breaks on the schedule timeline
- ✅ **Resize Duration**: Adjust appointment/break duration by dragging
- ✅ **Auto-Insert Breaks**: Automatically add 15-minute breaks between appointments
- ✅ **Touch Support**: Fully functional on mobile devices with touch controls
- ✅ **Responsive Design**: Optimized for both mobile and desktop screens
- ✅ **Supabase Integration**: All data persisted to Supabase database
- ✅ **Real-time Updates**: Changes sync immediately with the database

## Tech Stack

- **Frontend**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Database**: Supabase
- **Date Handling**: date-fns
- **Deployment**: Netlify-ready

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Supabase account and project

### Installation

1. **Clone the repository** (or use this folder):

```powershell
cd d:\Code\Web\MassagePlanner
```

2. **Install dependencies**:

```powershell
npm install
```

3. **Set up Supabase**:

   - Create a new project at [supabase.com](https://supabase.com)
   - Run the following SQL in your Supabase SQL Editor to create the required tables:

```sql
-- Create appointments table
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'appointment',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create breaks table
CREATE TABLE breaks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  start_time TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  type TEXT DEFAULT 'break',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_appointments_start_time ON appointments(start_time);
CREATE INDEX idx_breaks_start_time ON breaks(start_time);

-- Enable Row Level Security (optional, for production)
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE breaks ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (since no auth required)
CREATE POLICY "Allow all operations on appointments" ON appointments
  FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Allow all operations on breaks" ON breaks
  FOR ALL USING (true) WITH CHECK (true);
```

4. **Configure environment variables**:

   Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

   Get these values from your Supabase project settings (Settings > API).

### Development

Start the development server:

```powershell
npm run dev
```

The app will open at `http://localhost:3000`.

### Building for Production

Build the project:

```powershell
npm run build
```

Preview the production build:

```powershell
npm run preview
```

## Deployment

### Deploy to Netlify

1. **Push to GitHub** (or your preferred Git provider)

2. **Connect to Netlify**:
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" > "Import an existing project"
   - Connect your repository
   - Netlify will auto-detect the build settings from `netlify.toml`

3. **Set Environment Variables** in Netlify:
   - Go to Site Settings > Environment Variables
   - Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`

4. **Deploy**: Netlify will automatically build and deploy your site

## Project Structure

```
massage-planner/
├── src/
│   ├── components/          # React components
│   │   ├── AppointmentBlock.tsx
│   │   ├── AppointmentForm.tsx
│   │   ├── BreakBlock.tsx
│   │   └── ScheduleView.tsx
│   ├── hooks/               # Custom React hooks
│   │   ├── useAppointments.ts
│   │   ├── useDragDrop.ts
│   │   └── useResize.ts
│   ├── services/            # API and Supabase services
│   │   ├── appointmentService.ts
│   │   └── supabaseClient.ts
│   ├── types/               # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx              # Main app component
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles
├── public/                  # Static assets
├── .env.example             # Environment variables template
├── netlify.toml             # Netlify configuration
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.js
```

## Usage

### Creating an Appointment

1. Click "+ New Appointment" button
2. Fill in client name, start time, and duration
3. Click "Create Appointment"

### Drag & Drop

- **Move**: Click/touch and drag an appointment or break to a new time
- **Resize**: Drag the bottom edge of an appointment/break to adjust duration

### Auto-Insert Breaks

1. Create at least 2 appointments
2. Click "Auto-Insert Breaks" button
3. 15-minute breaks will be added between appointments (where there's space)

### Editing & Deleting

- Click "Edit" on an appointment to modify it
- Click "Delete" to remove an appointment or break

## Key Features Explained

### Drag-and-Drop System

The app uses custom hooks (`useDragDrop` and `useResize`) to handle both mouse and touch events, making it work seamlessly on desktop and mobile.

### Time Snapping

All drag operations snap to 15-minute intervals for clean scheduling.

### Automatic End Time Calculation

When creating or updating appointments, the end time is automatically calculated based on start time + duration.

### Responsive Layout

- **Mobile**: Compact timeline with touch-friendly controls
- **Desktop**: Wider view with more visible schedule items

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

## License

MIT

## Support

For issues or questions, please open an issue in the repository.
