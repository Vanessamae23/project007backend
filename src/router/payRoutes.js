import express from "express";
import Stripe from "stripe";
import {
  getUserBalance,
  topupBalance,
  getUserFrom,
  transferAmount,
  getUser,
  getUserPin,
  setUserScore,
} from "../database/db.js";
import bcrypt from "bcrypt";

// Now you can use bcrypt as usual, for example:
const saltRounds = 10;
const plainTextPassword = "your_password_here";

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_PASS);

router.post("/confirmPin", async (req, res) => {
  try {
    const { session } = req.cookies; 
    const pin = req.body.pin;
    
    await bcrypt.compare(pin, (await (getUserPin(req.user.uid))))
       .then(result => {
        if (!result) {
          return res.status(400).json({
            error: err.message,
          });
        }
          res.send({
            message: 'success'
          })
       })
       .catch(err => {
        res.status(400).json({
          error: err.message,
        });
       })
  } catch(e) {
    res.status(400).json({
      error: e.message,
    });
  };
})
// router endpoints
router.post("/intents", async (req, res) => {
  try {
    // create a PaymentIntent
    const customers = await stripe.customers.list({
      limit: 1,
      email: req.user.email
    });
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "sgd",
      payment_method_types: ["card"],
      customer: customers.data[0].id
    });
    
    if (paymentIntent.error) {
      console.log("Something went wrong", paymentIntent.error);
      return;
    }


    console.log(paymentIntent.client_secret)
    res.status(200).send({
      client_secret: paymentIntent.client_secret
    });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

// router endpoints
router.post("/withdraw", async (req, res) => {
  try {
    // create a PaymentIntent
    const customers = await stripe.customers.list({
      limit: 1,
      email: req.user.email
    });

    const paymentIntents = await stripe.paymentIntents.list({
      limit: 1,
      customer: customers.data[0].id
    });
    const transfer = await stripe.refunds.create({
      payment_intent: paymentIntents.data[0].id,
      amount: req.body.amount * 100,
    });

    if (transfer.error) {
      console.log("Something went wrong", transfer.error);
      return;
    }

    res.status(200).send({
      
    });
  } catch (e) {
    console.log(e.message)
    res.status(400).json({
      error: e.message,
    });
  }
});

router.get('/balance', async (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: 'not logged in'
    });
    return;
  }
  const customers = await stripe.customers.list({
    limit: 1,
    email: req.user.email
  });

  const charges = await stripe.charges.list({
    limit: 1,
    customer: customers.data[0].id
  });
  let totalRisk = 0;
  charges.data.forEach((charge, index) => {
    totalRisk += charge.outcome.risk_score
  })
  let finalScore = totalRisk / charges.data.length;
  setUserScore(req.user.uid, finalScore);
  console.log("risk score ", finalScore)
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
  if (typeof amount !== "number" || amount <= 0) {
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
});

router.post('/deduct', (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: 'not logged in',
    });
    return;
  }
  const { amount } = req.body;
  if (typeof amount !== "number" || amount <= 0) {
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
});

router.get('/find-users', (req, res) => {
  const { email, name } = req.query;
  if (email !== undefined && typeof email !== 'string') {
    res.status(400).send({
      message: 'malicious email!'
    });
    return;
  }
  if (name !== undefined && typeof name !== 'string') {
    res.status(400).send({
      message: 'malicious name!'
    });
    return;
  }
  if (email === undefined && name === undefined) {
    res.status(400).send({
      message: 'Either email or name must be provided!'
    })
  }
  getUserFrom(email, name).then(users => {
    if (users) {
      res.send({
        users: Object.values(users).map(user => ({
          email: user.email,
          name: user.fullName,
          uid: user.uid,
        })),
      });
    } else {
      res.send({
        users: [],
      })
    }
  });
});

router.post('/transfer', (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: 'not logged in',
    });
    return;
  }
  
  const { uid, amount } = req.body;
  if (typeof uid !== 'string') {
    res.status(400).send({
      message: 'malicious uid!',
    });
    return;
  }
  if (typeof amount !== 'number' || amount <= 0) {
    res.status(400).send({
      message: 'malicious amount!',
    });
    return;
  }

  transferAmount(req.user.uid, uid, amount)
    .then(() => {
      res.send({
        message: 'success',
      });
    })
    .catch(() => {
      res.send({
        message: 'failed',
      })
    });
});

export default router;
