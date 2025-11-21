import { Handler, schedule } from '@netlify/functions';

/**
 * AUTOMATIC DATA CLEANUP
 * 
 * This Netlify Scheduled Function automatically removes old appointments and breaks
 * that are older than 2 months. This keeps the database clean and prevents
 * unnecessary data accumulation.
 * 
 * The function calculates a cutoff date (2 months ago) and deletes all records
 * where start_time is before that date.
 * 
 * This function runs as a serverless cron job on Netlify at 3:00 AM UTC daily.
 * 
 * Schedule: Daily at 3:00 AM UTC (defined in netlify.toml)
 */

const SUPABASE_URL = process.env.VITE_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY!;

/**
 * Main handler for the cleanup function
 * Deletes all appointments and breaks older than 2 months
 */
const cleanupHandler: Handler = async (event, context) => {
  console.log('[Cleanup] Starting automatic data cleanup...');

  try {
    // Validate environment variables
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      console.error('[Cleanup] Missing Supabase credentials in environment variables');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Missing Supabase credentials' })
      };
    }

    // Calculate cutoff date (2 months ago)
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 2);
    const cutoffISOString = cutoffDate.toISOString();

    console.log('[Cleanup] Cutoff date:', cutoffISOString);
    console.log('[Cleanup] Deleting all records with start_time before this date...');

    // Delete old appointments
    console.log('[Cleanup] Deleting old appointments...');
    const deleteAppointmentsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?start_time=lt.${cutoffISOString}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    let deletedAppointmentsCount = 0;
    if (!deleteAppointmentsResponse.ok) {
      const errorText = await deleteAppointmentsResponse.text();
      console.error('[Cleanup] Failed to delete appointments:', errorText);
    } else {
      const deletedAppointments = await deleteAppointmentsResponse.json();
      deletedAppointmentsCount = Array.isArray(deletedAppointments) ? deletedAppointments.length : 0;
      console.log('[Cleanup] Deleted appointments:', deletedAppointmentsCount);
    }

    // Delete old breaks
    console.log('[Cleanup] Deleting old breaks...');
    const deleteBreaksResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/breaks?start_time=lt.${cutoffISOString}`,
      {
        method: 'DELETE',
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=representation'
        }
      }
    );

    let deletedBreaksCount = 0;
    if (!deleteBreaksResponse.ok) {
      const errorText = await deleteBreaksResponse.text();
      console.error('[Cleanup] Failed to delete breaks:', errorText);
    } else {
      const deletedBreaks = await deleteBreaksResponse.json();
      deletedBreaksCount = Array.isArray(deletedBreaks) ? deletedBreaks.length : 0;
      console.log('[Cleanup] Deleted breaks:', deletedBreaksCount);
    }

    console.log('[Cleanup] Cleanup completed successfully');
    console.log(`[Cleanup] Total records deleted: ${deletedAppointmentsCount + deletedBreaksCount}`);

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        message: 'Data cleanup completed successfully',
        timestamp: new Date().toISOString(),
        cutoffDate: cutoffISOString,
        deletedAppointments: deletedAppointmentsCount,
        deletedBreaks: deletedBreaksCount,
        totalDeleted: deletedAppointmentsCount + deletedBreaksCount
      })
    };

  } catch (error) {
    console.error('[Cleanup] Unexpected error:', error);
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
// Runs daily at 3:00 AM UTC
export const handler = schedule('0 3 * * *', cleanupHandler);
