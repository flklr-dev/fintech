const express = require('express');
const pesoPayController = require('../controllers/pesoPayController');
const authController = require('../controllers/authController');

const router = express.Router();

// Protect all routes
router.use(authController.protect);

// Card routes
router
  .route('/cards')
  .get(pesoPayController.getLinkedCards)
  .post(pesoPayController.linkCard);

router
  .route('/cards/:id')
  .delete(pesoPayController.removeCard);

router
  .route('/cards/:id/default')
  .patch(pesoPayController.setDefaultCard);

// Bank account routes
router
  .route('/accounts')
  .get(pesoPayController.getLinkedAccounts)
  .post(pesoPayController.linkAccount);

router
  .route('/accounts/:id')
  .delete(pesoPayController.removeAccount);

router
  .route('/accounts/:id/default')
  .patch(pesoPayController.setDefaultAccount);

module.exports = router; 