'use strict';

const { query: dbQuery } = require('../db');
const { createError }    = require('../middleware/errorHandler');

// ─── Helper: format a DB row into API response shape ─────────────────────────
function formatResume(row) {
  return {
    id:          row.id,
    versionName: row.version_name,
    fileName:    row.file_name,
    fileSize:    row.file_size,
    isActive:    row.is_active,
    notes:       row.notes || null,
    tags:        row.tags  || [],
    createdAt:   row.created_at,
    updatedAt:   row.updated_at,
  };
}

// ─── GET /api/resumes ─────────────────────────────────────────────────────────
async function listResumes(req, res, next) {
  try {
    const result = await dbQuery(
      // Active version first, then newest first
      `SELECT * FROM resumes
       WHERE  user_id = $1
       ORDER  BY is_active DESC, created_at DESC`,
      [req.userId]
    );

    res.status(200).json({
      success: true,
      count:   result.rowCount,
      data:    result.rows.map(formatResume),
    });
  } catch (err) {
    next(err);
  }
}

// ─── POST /api/resumes ────────────────────────────────────────────────────────
async function createResume(req, res, next) {
  try {
    const { version_name, file_name, file_size, notes, tags } = req.body;

    // Check if this user already has a resume with the same version name
    const duplicate = await dbQuery(
      'SELECT id FROM resumes WHERE user_id = $1 AND version_name = $2',
      [req.userId, version_name]
    );
    if (duplicate.rowCount > 0) {
      throw createError(`A resume version named "${version_name}" already exists`, 409);
    }

    const result = await dbQuery(
      `INSERT INTO resumes (user_id, version_name, file_name, file_size, notes, tags)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        req.userId,
        version_name,
        file_name,
        file_size || null,
        notes     || null,
        tags      || [],
      ]
    );

    // Increment Prometheus counter
    req.app.locals.metrics?.resumesUploadedTotal?.inc();

    res.status(201).json({
      success: true,
      message: 'Resume version created',
      data:    formatResume(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── GET /api/resumes/:id ─────────────────────────────────────────────────────
async function getResume(req, res, next) {
  try {
    const result = await dbQuery(
      'SELECT * FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      throw createError('Resume version not found', 404);
    }
    res.status(200).json({
      success: true,
      data:    formatResume(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PUT /api/resumes/:id ─────────────────────────────────────────────────────
async function updateResume(req, res, next) {
  try {
    // Verify ownership
    const existing = await dbQuery(
      'SELECT id, version_name FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (existing.rowCount === 0) {
      throw createError('Resume version not found', 404);
    }

    const { version_name, notes, tags } = req.body;

    // If renaming, ensure the new name doesn't clash with another version
    if (version_name && version_name !== existing.rows[0].version_name) {
      const clash = await dbQuery(
        'SELECT id FROM resumes WHERE user_id = $1 AND version_name = $2 AND id != $3',
        [req.userId, version_name, req.params.id]
      );
      if (clash.rowCount > 0) {
        throw createError(`A resume version named "${version_name}" already exists`, 409);
      }
    }

    const result = await dbQuery(
      `UPDATE resumes
       SET    version_name = COALESCE($1, version_name),
              notes        = COALESCE($2, notes),
              tags         = COALESCE($3, tags)
       WHERE  id = $4 AND user_id = $5
       RETURNING *`,
      [
        version_name || null,
        notes        !== undefined ? notes : null,
        tags         || null,
        req.params.id,
        req.userId,
      ]
    );

    res.status(200).json({
      success: true,
      message: 'Resume version updated',
      data:    formatResume(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
}

// ─── DELETE /api/resumes/:id ──────────────────────────────────────────────────
async function deleteResume(req, res, next) {
  try {
    const result = await dbQuery(
      'DELETE FROM resumes WHERE id = $1 AND user_id = $2 RETURNING id, is_active',
      [req.params.id, req.userId]
    );
    if (result.rowCount === 0) {
      throw createError('Resume version not found', 404);
    }

    res.status(200).json({
      success: true,
      message: 'Resume version deleted',
      ...(result.rows[0].is_active && {
        warning: 'The deleted version was your active resume. Please set a new active version.',
      }),
    });
  } catch (err) {
    next(err);
  }
}

// ─── PATCH /api/resumes/:id/set-active ───────────────────────────────────────
async function setActive(req, res, next) {
  try {
    // Verify target resume belongs to this user
    const target = await dbQuery(
      'SELECT id FROM resumes WHERE id = $1 AND user_id = $2',
      [req.params.id, req.userId]
    );
    if (target.rowCount === 0) {
      throw createError('Resume version not found', 404);
    }

    // Use a transaction: deactivate all → activate the target
    const pgClient = await require('../db').pool.connect();
    try {
      await pgClient.query('BEGIN');

      // Step 1: Clear all active flags for this user
      await pgClient.query(
        'UPDATE resumes SET is_active = false WHERE user_id = $1',
        [req.userId]
      );

      // Step 2: Set the target as active
      const result = await pgClient.query(
        'UPDATE resumes SET is_active = true WHERE id = $1 RETURNING *',
        [req.params.id]
      );

      await pgClient.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Active resume version updated',
        data:    formatResume(result.rows[0]),
      });
    } catch (err) {
      await pgClient.query('ROLLBACK');
      throw err;
    } finally {
      pgClient.release();
    }
  } catch (err) {
    next(err);
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  listResumes,
  createResume,
  getResume,
  updateResume,
  deleteResume,
  setActive,
};
