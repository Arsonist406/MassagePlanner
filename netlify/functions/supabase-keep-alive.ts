import { Handler, schedule } from '@netlify/functions';

/**
 * SUPABASE AUTO-PAUSE PREVENTION
 * 
 * Supabase automatically pauses inactive projects after 7 days without any database activity.
 * This Netlify Scheduled Function prevents that by creating a temporary break record once per day,
 * then immediately deleting it. This keeps the database "active" without cluttering real data.
 * 
 * The break uses early morning times (03:00-03:01) that won't interfere with normal
 * business hours scheduling.
 * 
 * This function runs as a serverless cron job on Netlify - it does NOT run in the browser
 * and is completely compliant with Netlify's free tier policies.
 * 
 * Schedule: Daily at 7:00 AM UTC (defined in netlify.toml)
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

/**
 * Main handler for the keep-alive function
 * Creates and immediately deletes a temporary break to keep Supabase active
 */
const keepAliveHandler: Handler = async (event, context) => {
  console.log('[KeepAlive] Starting Supabase keep-alive ping...');

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[KeepAlive] Missing Supabase credentials in environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase credentials' })
      };
    }

    // Create timestamp for today at 03:0:00
    const now = new Date();
    now.setHours(3, 0, 0, 0);
    const start_time = now.toISOString();

    // Create end time at 03:01:00 (1 minute duration)
    now.setMinutes(1);
    const end_time = now.toISOString();

    console.log('[KeepAlive] Creating temporary break:', { start_time, end_time });

    // Create temporary break record
    const createResponse = await fetch(`${SUPABASE_URL}/rest/v1/breaks`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({
        start_time,
        end_time,
        duration_minutes: 1
      })
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error('[KeepAlive] Failed to create break:', errorText);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to create break', details: errorText })
      };
    }

    const createdBreak = await createResponse.json();
    const breakId = Array.isArray(createdBreak) ? createdBreak[0]?.id : createdBreak.id;

    console.log('[KeepAlive] Break created successfully, ID:', breakId);

    // Wait 5 seconds before deleting to ensure database activity is properly registered
    await new Promise(resolve => setTimeout(resolve, 5000));
    console.log('[KeepAlive] Waited 5 seconds, now deleting temporary break...');

    // Delete the temporary break to avoid clutter
    if (breakId) {
      const deleteResponse = await fetch(`${SUPABASE_URL}/rest/v1/breaks?id=eq.${breakId}`, {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('[KeepAlive] Failed to delete break:', errorText);
        // Don't fail the entire function if delete fails - the break was created successfully
      } else {
        console.log('[KeepAlive] Break deleted successfully, ID:', breakId);
      }
    }

    console.log('[KeepAlive] Keep-alive ping completed successfully');

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        ok: true, 
        message: 'Supabase keep-alive ping successful',
        timestamp: new Date().toISOString(),
        breakId
      })
    };

  } catch (error) {
    console.error('[KeepAlive] Unexpected error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Unexpected error occurred', 
        message: error instanceof Error ? error.message : 'Unknown error'
      })
    };
  }
};

// Export the handler wrapped with the schedule function
export const handler = schedule('0 3 * * *', keepAliveHandler);
