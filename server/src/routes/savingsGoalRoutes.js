const express = require('express');
const savingsGoalController = require('../controllers/savingsGoalController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes after this middleware
router.use(authController.protect);

router
  .route('/')
  .get(savingsGoalController.getAllGoals)
  .post(savingsGoalController.createGoal);

router
  .route('/:id')
  .get(savingsGoalController.getGoal)
  .patch(savingsGoalController.updateGoal)
  .delete(savingsGoalController.deleteGoal);

router
  .route('/:id/contribute')
  .post(savingsGoalController.addContribution);

module.exports = router; 