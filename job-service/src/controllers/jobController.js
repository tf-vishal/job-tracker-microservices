'use strict';

const { query: dbQuery } = require('../db');
const { createError }    = require('../middleware/errorHandler');

// ─── Helper: format a DB row into API response shape ─────────────────────────
function formatJob(row) {
  return {
    id:          row.id,
    company:     row.company,
    role:        row.role,
    status:      row.status,
    appliedDate: row.applied_date,
    notes:       row.notes       || null,
    jobUrl:      row.job_url     || null,
    salaryRange: row.salary_range || null,
    location:    row.location    || null,
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ─── GET /api/jobs ────────────────────────────────────────────────────────────
async function listJobs(req, res, next) {
  try {
    const { status } = req.query;

    let sql    = 'SELECT * FROM jobs WHERE user_id = $1';
    const params = [req.userId];

    if (status) {
      params.push(status);
      sql += ` AND status = $${params.length}`;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await dbQuery(sql, params);

    res.status(200).json({
      success: true,
      count:   result.rowCount,
      data:    result.rows.map(formatJob),
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/jobs ───────────────────────────────────────────────────────────
async function createJob(req, res, next) {
  try {
    const { company, role, status, applied_date, notes, job_url, salary_range, location } = req.body;

    const result = await dbQuery(
      `INSERT INTO jobs (user_id, company, role, status, applied_date, notes, job_url, salary_range, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [
        req.userId,
        company,
        role,
        status || 'applied',
        applied_date || new Date().toISOString().split('T')[0],
        notes        || null,
        job_url      || null,
        salary_range || null,
        location     || null,
      ]
    );

    // Increment Prometheus counter
    req.app.locals.metrics?.jobsCreatedTotal?.inc();

    res.status(201).json({
      success: true,
      message: 'Job application created',
      data:    formatJob(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/jobs/stats ──────────────────────────────────────────────────────
async function getStats(req, res, next) {
  try {
    const result = await dbQuery(
      `SELECT
         status,
         COUNT(*)::int AS count
       FROM jobs
       WHERE user_id = $1
       GROUP BY status`,
      [req.userId]
    );

    // Build a complete map with 0 for statuses that have no entries
    const allStatuses = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];
    const statsMap    = Object.fromEntries(allStatuses.map((s) => [s, 0]));
    for (const row of result.rows) {
      statsMap[row.status] = row.count;
    }

    const totalResult = await dbQuery(
      'SELECT COUNT(*)::int AS total FROM jobs WHERE user_id = $1',
      [req.userId]
    );

    res.status(200).json({
      success: true,
      data: {
        total:    totalResult.rows[0].total,
        byStatus: statsMap,
      },
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/jobs/stale (internal — called by Notification Service) ──────────
async function getStaleJobs(req, res, next) {
  try {
    // Jobs in active statuses that haven't been updated in the last 7 days
    const result = await dbQuery(
      `SELECT id, user_id, company, role, status, updated_at
       FROM   jobs
       WHERE  status IN ('applied', 'screening', 'interview')
       AND    updated_at < NOW() - INTERVAL '7 days'
       ORDER  BY updated_at ASC`,
      []
    );

    res.status(200).json({
      success: true,
      count:   result.rowCount,
      data:    result.rows,
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/jobs/:id ────────────────────────────────────────────────────────
async function getJob(req, res, next) {
  try {
    const result = await dbQuery(
      'SELECT * FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      throw createError('Job application not found', 404);
    }
    res.status(200).json({
      success: true,
      data:    formatJob(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/jobs/:id ────────────────────────────────────────────────────────
async function updateJob(req, res, next) {
  try {
    // Verify ownership before updating
    const existing = await dbQuery(
      'SELECT id FROM jobs WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (existing.rowCount === 0) {
      throw createError('Job application not found', 404);
    }

    const { company, role, status, applied_date, notes, job_url, salary_range, location } = req.body;

    const result = await dbQuery(
      `UPDATE jobs
       SET    company      = $1,
              role         = $2,
              status       = $3,
              applied_date = $4,
              notes        = $5,
              job_url      = $6,
              salary_range = $7,
              location     = $8
       WHERE  id = $9 AND user_id = $10
       RETURNING *`,
      [
        company,
        role,
        status       || 'applied',
        applied_date || new Date().toISOString().split('T')[0],
        notes        || null,
        job_url      || null,
        salary_range || null,
        location     || null,
        req.params.id,
        req.userId,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Job application updated',
      data:    formatJob(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/jobs/:id ─────────────────────────────────────────────────────
async function deleteJob(req, res, next) {
  try {
    const result = await dbQuery(
      'DELETE FROM jobs WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      throw createError('Job application not found', 404);
    }
    res.status(200).json({
      success: true,
      message: 'Job application deleted',
    });
  } catch (err) {
    next(err);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  listJobs,
  createJob,
  getStats,
  getStaleJobs,
  getJob,
  updateJob,
  deleteJob,
};
