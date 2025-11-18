# QUICK START GUIDE

## Get Your Massage Planner Running in 5 Minutes

### 1️⃣ Install Dependencies

```powershell
npm install
```

This will install all required packages:
- React & React DOM
- Vite (build tool)
- TypeScript
- TailwindCSS
- Supabase client
- date-fns (date utilities)

### 2️⃣ Set Up Supabase Database

Follow the detailed instructions in `SUPABASE_SETUP.md`, or quick version:

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to SQL Editor and run the setup script from `SUPABASE_SETUP.md`
4. Get your project URL and anon key from Settings > API

### 3️⃣ Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

### 4️⃣ Start Development Server

```powershell
npm run dev
```

The app will open at `http://localhost:3000` 🎉

### 5️⃣ Try It Out!

1. Click **"+ New Appointment"**
2. Enter a client name and select time/duration
3. Create a few appointments
4. Click **"Auto-Insert Breaks"** to add breaks between appointments
5. Try **dragging appointments** to move them
6. Try **dragging the bottom edge** to resize duration

## Common Issues

### ❌ "Cannot find module 'react'" errors

**Solution**: Run `npm install`

### ❌ "Failed to load schedule"

**Solution**: 
1. Check that `.env` file exists and has correct values
2. Verify Supabase tables were created (check Table Editor in Supabase dashboard)
3. Make sure your Supabase project URL and anon key are correct

### ❌ Build errors with TypeScript

**Solution**: The project is configured correctly. If you see TS errors:
1. Make sure all dependencies are installed: `npm install`
2. Try deleting `node_modules` and running `npm install` again
3. Restart your code editor

### ❌ Styles not working

**Solution**: 
1. Make sure TailwindCSS is installed: `npm install -D tailwindcss postcss autoprefixer`
2. Check that `tailwind.config.js` and `postcss.config.js` exist
3. Restart dev server: Stop (Ctrl+C) and run `npm run dev` again

## Production Build

Build for production:

```powershell
npm run build
```

Preview production build:

```powershell
npm run preview
```

## Deploy to Netlify

1. Push code to GitHub
2. Connect repository to Netlify
3. Set environment variables in Netlify dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy! 🚀

Netlify will automatically detect build settings from `netlify.toml`.

## Next Steps

- **Customize**: Edit colors in `tailwind.config.js`
- **Add Features**: Extend with client contact info, notes, etc.
- **Improve**: Add search, filtering, calendar view
- **Secure**: Add authentication for multi-user scenarios

## Need Help?

- Check `README.md` for full documentation
- Check `SUPABASE_SETUP.md` for database setup details
- Review code comments - they explain key logic
- Open an issue if you encounter problems

---

**Happy Scheduling! 💆‍♀️**
