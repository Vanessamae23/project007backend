import express from "express";
import Stripe from "stripe";
import {
  getUserBalance,
  topupBalance,
  getUserFrom,
  transferAmount,
  getUser,
  getUserPin,
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
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "sgd",
      payment_method_types: ["card"],
    });
    if (paymentIntent.error) {
      console.log("Something went wrong", paymentIntent.error);
      return;
    }
    console.log(paymentIntent)

    // Complete the payment using a test card.
    // const response = await stripe.paymentIntents
    //   .confirm(paymentIntent.id, {
    //     payment_method: "pm_card_visa",
    //     payment_method_types: ["card"],
    //   })
    //   .then((res) => {
    //     console.log(res);
    //   })
    //   .catch((err) => {
    //     console.log(err.message);
    //   });
    // console.log(response)
    // Return the secret
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
