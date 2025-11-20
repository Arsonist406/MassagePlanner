# Supabase Keep-Alive Setup

## 🎯 Purpose

Supabase automatically pauses inactive projects after 7 days without database activity. This Netlify Scheduled Function prevents that by making a daily database operation.

## 🔧 How It Works

1. **Netlify Scheduled Function** (`/netlify/functions/supabase-keep-alive.ts`)
   - Runs as a serverless cron job every day at 3:00 AM UTC
   - Creates a temporary break record with times 03:00-03:01 (early morning, won't interfere with real appointments)
   - Immediately deletes the record after creation
   - Keeps your Supabase database active without cluttering data

2. **Configuration** (`netlify.toml`)
   - Defines the scheduled function with cron schedule `0 3 * * *` (daily at 3:00 AM UTC)
   - Automatically runs on Netlify's servers - no browser/client needed

## ✅ Why This Approach Is Correct

- **✅ Compliant with Netlify free tier** - uses official Scheduled Functions feature
- **✅ Serverless** - runs on Netlify's infrastructure, not in the browser
- **✅ Reliable** - works even when your site is "asleep" or has no visitors
- **✅ Lives in repository** - code is version controlled and deployed automatically
- **✅ No external services needed** - no VPS, no separate cron services

## ❌ Why Browser-Based Approach Was Wrong

The initial implementation using browser timers (`setTimeout`/`setInterval`) would NOT work because:

- Browsers limit/throttle background tabs and timers
- Netlify doesn't allow 24/7 background execution in the browser
- Would only work when a user has the site open
- Violates Netlify's Terms of Service for background execution

## 🚀 Deployment

After pushing to your repository:

1. Netlify will automatically detect the scheduled function
2. The function will be deployed with your site
3. The cron schedule will be activated automatically
4. Check Netlify Functions logs to verify execution

## 🧪 Testing Locally

To test the function locally:

```bash
netlify dev
```

Then manually invoke the function:

```bash
netlify functions:invoke supabase-keep-alive
```

## 📊 Monitoring

Check your Netlify Functions logs to see the keep-alive pings:
- Go to Netlify Dashboard → Your Site → Functions
- Look for `supabase-keep-alive` executions
- Verify it runs daily at 3:00 AM UTC

## 🔑 Environment Variables

Make sure these are set in Netlify:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon/public key

These should already be configured if your site is working.

## 📝 Cron Schedule

Current schedule: `0 3 * * *` (3:00 AM UTC daily)

To change the schedule, edit `netlify.toml`:
- `0 */12 * * *` - Every 12 hours
- `0 0 * * *` - Midnight UTC daily
- `0 12 * * 1` - Noon UTC every Monday

## 💰 Free Tier Limits

Netlify Free Tier includes:
- 125,000 function invocations per month
- This keep-alive uses ~30 invocations per month
- You're well within limits! 🎉
