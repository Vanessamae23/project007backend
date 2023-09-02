import express from "express";
import Stripe from "stripe";
import {
  getUserBalance,
  setUserBalance,
  topupBalance,
} from "../database/db.js";

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_PASS);

// router endpoints
router.post("/intents", async (req, res) => {
  try {
    // create a PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "sgd",
      payment_method_types: ["card"],
    });
    if (paymentIntent.error) {
      console.log("Something went wrong", paymentIntent.error);
      return;
    }
    console.log(req.body.billingDetails);
    // Complete the payment using a test card.
    const response = await stripe.paymentIntents
      .confirm(paymentIntent.id, {
        payment_method: "pm_card_visa",
        payment_method_types: ["card"],
      })
      .then((res) => {
        console.log(res);
      })
      .catch((err) => {
        console.log(err.message);
      });

    // Return the secret
    res.json({ paymentIntent: paymentIntent.client_secret });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

router.get('/balance', (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: 'not logged in'
    });
    return;
  }
  getUserBalance(req.user.uid).then(balance => {
    res.send(JSON.stringify({
      balance: balance,
    }));
  })
});

router.post('/topup', (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: 'not logged in',
    });
    return;
  }
  const { amount } = req.body;
  if (typeof amount !== "number") {
    res.status(400).send("malicious number!");
    return;
  }
  topupBalance(req.user.uid, amount)
    .then(() => res.send({
      message: 'success'
    }))
    .catch(() => res.status(500).send({
      message: 'failed'
    }));
})

export default router;
