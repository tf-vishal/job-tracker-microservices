'use strict';

const { Router } = require('express');
const { param }  = require('express-validator');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/notificationController');

const router = Router();

function extractUser(req, res, next) {
  const userId = req.headers['x-user-id'];
  if (!userId) return res.status(401).json({ success: false, message: 'Missing X-User-Id header' });
  req.userId = userId;
  next();
}

function requireServiceKey(req, res, next) {
  const key = req.headers['x-service-key'];
  if (!key || key !== process.env.SERVICE_API_KEY) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  next();
}

const idRule = [param('id').isUUID().withMessage('Invalid notification ID')];

// GET  /api/notifications
router.get('/',                    extractUser, ctrl.listNotifications);
// PATCH /api/notifications/read-all
router.patch('/read-all',          extractUser, ctrl.markAllRead);
// PATCH /api/notifications/:id/read
router.patch('/:id/read',          extractUser, idRule, validate, ctrl.markRead);
// POST /api/notifications/trigger  (internal)
router.post('/trigger',            requireServiceKey, ctrl.trigger);

module.exports = router;
