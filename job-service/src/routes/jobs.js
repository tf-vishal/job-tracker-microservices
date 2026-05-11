'use strict';

const { Router } = require('express');
const { body, query, param } = require('express-validator');
const { validate }     = require('../middleware/validate');
const jobController    = require('../controllers/jobController');

const router = Router();

// ─── Middleware: extract userId from X-User-Id header (set by API Gateway) ────
function extractUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Missing X-User-Id header' });
  }
  req.userId = userId;
  next();
}

// ─── Middleware: validate internal service key (for /stale endpoint) ──────────
function requireServiceKey(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!key || key !== process.env.SERVICE_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

// ─── Validation Schemas ───────────────────────────────────────────────────────
const VALID_STATUSES = ['applied', 'screening', 'interview', 'offer', 'rejected', 'withdrawn'];

const jobBodyRules = [
  body('company')
    .trim()
    .notEmpty().withMessage('Company is required')
    .isLength({ max: 255 }).withMessage('Company must be ≤ 255 characters'),
  body('role')
    .trim()
    .notEmpty().withMessage('Role is required')
    .isLength({ max: 255 }).withMessage('Role must be ≤ 255 characters'),
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status must be one of: ${VALID_STATUSES.join(', ')}`),
  body('applied_date')
    .optional()
    .isISO8601().withMessage('applied_date must be a valid ISO 8601 date'),
  body('notes')
    .optional()
    .isString(),
  body('job_url')
    .optional()
    .isURL().withMessage('job_url must be a valid URL'),
  body('salary_range')
    .optional()
    .isLength({ max: 100 }),
  body('location')
    .optional()
    .isLength({ max: 255 }),
];

const idParamRule = [
  param('id')
    .isUUID().withMessage('Job ID must be a valid UUID'),
];

const statusQueryRule = [
  query('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage(`Status filter must be one of: ${VALID_STATUSES.join(', ')}`),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/jobs/stats  — must be declared before /:id to avoid route conflict
router.get('/stats',  extractUser, jobController.getStats);

// GET /api/jobs/stale — internal endpoint for Notification Service
router.get('/stale',  requireServiceKey, jobController.getStaleJobs);

// GET /api/jobs
router.get('/',       extractUser, statusQueryRule, validate, jobController.listJobs);

// POST /api/jobs
router.post('/',      extractUser, jobBodyRules, validate, jobController.createJob);

// GET /api/jobs/:id
router.get('/:id',    extractUser, idParamRule, validate, jobController.getJob);

// PUT /api/jobs/:id
router.put('/:id',    extractUser, [...idParamRule, ...jobBodyRules], validate, jobController.updateJob);

// DELETE /api/jobs/:id
router.delete('/:id', extractUser, idParamRule, validate, jobController.deleteJob);

module.exports = router;
