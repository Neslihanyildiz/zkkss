const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const authMiddleware = require('../middleware/authMiddleware');
const role = require('../middleware/roleMiddleware');

// All admin routes require a valid JWT + appropriate role
router.use(authMiddleware);

// GET  /api/admin/users           — admin or system_manager
router.get('/users', role('admin', 'system_manager'), adminController.getAllUsers);

// PATCH /api/admin/users/:id/role — system_manager only
router.patch('/users/:id/role', role('system_manager'), adminController.updateUserRole);

// DELETE /api/admin/users/:id     — system_manager only
router.delete('/users/:id', role('system_manager'), adminController.deleteUser);

module.exports = router;
