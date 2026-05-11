'use strict';

const { query: dbQuery } = require('../db');
const { createError }    = require('../middleware/errorHandler');
const { checkStaleJobs } = require('../cron/scheduler');

// GET /api/notifications  — paginated, newest first
async function listNotifications(req, res, next) {
  try {
    const limit  = Math.min(parseInt(req.query.limit  || '20', 10), 100);
    const offset = Math.max(parseInt(req.query.offset || '0',  10), 0);

    const result = await dbQuery(
      `SELECT id, job_id, company, role, message, is_read, sent_at
       FROM   notification_logs
       WHERE  user_id = $1
       ORDER  BY sent_at DESC
       LIMIT  $2 OFFSET $3`,
      [req.userId, limit, offset]
    );

    const countResult = await dbQuery(
      'SELECT COUNT(*)::int AS total, COUNT(*) FILTER (WHERE is_read = false)::int AS unread FROM notification_logs WHERE user_id = $1',
      [req.userId]
    );

    res.status(200).json({
      success: true,
      data:    result.rows,
      meta: {
        total:  countResult.rows[0].total,
        unread: countResult.rows[0].unread,
        limit,
        offset,
      },
    });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
async function markRead(req, res, next) {
  try {
    const result = await dbQuery(
      `UPDATE notification_logs
       SET    is_read = true
       WHERE  id = $1 AND user_id = $2
       RETURNING id`,
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      throw createError('Notification not found', 404);
    }
    res.status(200).json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
async function markAllRead(req, res, next) {
  try {
    await dbQuery(
      'UPDATE notification_logs SET is_read = true WHERE user_id = $1',
      [req.userId]
    );
    res.status(200).json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    next(err);
  }
}

// POST /api/notifications/trigger  — manual trigger for testing
async function trigger(req, res, next) {
  try {
    const count = await checkStaleJobs();
    res.status(200).json({
      success: true,
      message: `Notification check complete. ${count} notification(s) created.`,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotifications, markRead, markAllRead, trigger };
