'use strict';

const { Router } = require('express');
const { body, param } = require('express-validator');
const { validate }       = require('../middleware/validate');
const resumeController   = require('../controllers/resumeController');

const router = Router();

// ─── Middleware: extract userId injected by API Gateway ───────────────────────
function extractUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Missing X-User-Id header' });
  }
  req.userId = userId;
  next();
}

// ─── Validation Schemas ───────────────────────────────────────────────────────
const resumeBodyRules = [
  body('version_name')
    .trim()
    .notEmpty().withMessage('Version name is required')
    .isLength({ max: 255 }).withMessage('Version name must be ≤ 255 characters'),
  body('file_name')
    .trim()
    .notEmpty().withMessage('File name is required')
    .isLength({ max: 255 }).withMessage('File name must be ≤ 255 characters')
    .matches(/\.(pdf|docx|doc|txt)$/i).withMessage('File name must end in .pdf, .docx, .doc, or .txt'),
  body('file_size')
    .optional()
    .isInt({ min: 1, max: 10_000_000 }).withMessage('File size must be between 1 and 10,000,000 bytes'),
  body('notes')
    .optional()
    .isString(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => tags.every((t) => typeof t === 'string' && t.length <= 50))
    .withMessage('Each tag must be a string ≤ 50 characters'),
];

const updateBodyRules = [
  body('version_name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 255 }).withMessage('Version name must be 1–255 characters'),
  body('notes')
    .optional()
    .isString(),
  body('tags')
    .optional()
    .isArray().withMessage('Tags must be an array')
    .custom((tags) => tags.every((t) => typeof t === 'string' && t.length <= 50))
    .withMessage('Each tag must be a string ≤ 50 characters'),
];

const idParamRule = [
  param('id').isUUID().withMessage('Resume ID must be a valid UUID'),
];

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/resumes
router.get('/',                 extractUser, resumeController.listResumes);

// POST /api/resumes
router.post('/',                extractUser, resumeBodyRules, validate, resumeController.createResume);

// GET /api/resumes/:id
router.get('/:id',              extractUser, idParamRule, validate, resumeController.getResume);

// PUT /api/resumes/:id
router.put('/:id',              extractUser, [...idParamRule, ...updateBodyRules], validate, resumeController.updateResume);

// DELETE /api/resumes/:id
router.delete('/:id',           extractUser, idParamRule, validate, resumeController.deleteResume);

// PATCH /api/resumes/:id/set-active
router.patch('/:id/set-active', extractUser, idParamRule, validate, resumeController.setActive);

module.exports = router;
