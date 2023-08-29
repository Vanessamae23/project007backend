const express = require('express');
const router = express.Router();
const stripe = require('stripe')(
  'sk_test_51NjbB7DNoOorWK5qi6SoNw3nQyMEY943N9gPbRUbpYD27oXa3Ruo8w3LTudRGRNARKzm2fE4YUnhCbvGnf8QP21z00Dsd5BHbP'
);

// router endpoints
router.post('/intents', async (req, res) => {
  try {
    // create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount, 
      currency: 'sgd',
      payment_method_types: ['card']
    //   automatic_payment_methods: {
    //     enabled: true,
    //   },
    });
    // Return the secret
    res.json({ paymentIntent: paymentIntent.client_secret });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

module.exports = router;