'use strict';

const cron  = require('node-cron');
const axios = require('axios');
const { query } = require('../db');

const JOB_SERVICE_URL = process.env.JOB_SERVICE_URL || 'http://job-service:3002';
const SERVICE_API_KEY = process.env.SERVICE_API_KEY || '';
const CRON_SCHEDULE   = process.env.CRON_SCHEDULE   || '0 * * * *';

/**
 * Core job: fetch stale applications from job-service, create notification
 * records for any job that hasn't been notified in the last 7 days.
 * Returns the number of notifications created.
 */
async function checkStaleJobs() {
  console.log('[notification-service:cron] Running stale-job check...');

  let staleJobs;
  try {
    const response = await axios.get(`${JOB_SERVICE_URL}/api/jobs/stale`, {
      headers: { 'x-service-key': SERVICE_API_KEY },
      timeout: 10_000,
    });
    staleJobs = response.data.data || [];
  } catch (err) {
    console.error('[notification-service:cron] Failed to fetch stale jobs:', err.message);
    return 0;
  }

  if (staleJobs.length === 0) {
    console.log('[notification-service:cron] No stale jobs found.');
    return 0;
  }

  let created = 0;

  for (const job of staleJobs) {
    // Only notify if we haven't already notified about this job in the last 7 days
    const recentCheck = await query(
      `SELECT id FROM notification_logs
       WHERE  job_id = $1
       AND    sent_at > NOW() - INTERVAL '7 days'
       LIMIT  1`,
      [job.id]
    );

    if (recentCheck.rowCount > 0) continue;

    const message = `Follow up on your ${job.role} application at ${job.company} — status: ${job.status}, last updated ${new Date(job.updated_at).toLocaleDateString()}.`;

    await query(
      `INSERT INTO notification_logs (user_id, job_id, company, role, message)
       VALUES ($1, $2, $3, $4, $5)`,
      [job.user_id, job.id, job.company, job.role, message]
    );

    console.log(`[notification-service:cron] [REMINDER] ${message}`);
    created++;
  }

  console.log(`[notification-service:cron] Created ${created} notification(s).`);
  return created;
}

/**
 * Registers the cron job. Called once on service startup.
 */
function startScheduler() {
  if (!cron.validate(CRON_SCHEDULE)) {
    console.error(`[notification-service:cron] Invalid CRON_SCHEDULE: "${CRON_SCHEDULE}"`);
    return;
  }

  cron.schedule(CRON_SCHEDULE, () => {
    checkStaleJobs().catch((err) =>
      console.error('[notification-service:cron] Unexpected error:', err.message)
    );
  });

  console.log(`[notification-service:cron] Scheduler started — schedule: "${CRON_SCHEDULE}"`);
}

module.exports = { startScheduler, checkStaleJobs };
