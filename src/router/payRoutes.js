import express from "express";
import Stripe from "stripe";
import {
  getUserBalance,
  topupBalance,
  getUserFrom,
  transferAmount,
  confirmPin,
  getUserPin,
  setUserScore,
  getTransactionsByUser,
  deductBalance,
  getUserGuardianId,
  getUserEmail,
  getUserName,
} from "../database/db.js";
import nodemailer from "nodemailer";
import bcrypt from "bcrypt";

const router = express.Router();
const stripe = Stripe(process.env.STRIPE_PASS);
const transporter = nodemailer.createTransport({
  service: process.env.NODE_MAILER_SERVICE,
  host: process.env.NODE_MAILER_HOST,
  port: process.env.NODE_MAILER_PORT,
  secure: process.env.NODE_MAILER_IS_SECURE,
  auth: {
    user: process.env.NODE_MAILER_USER,
    pass: process.env.NODE_MAILER_PASS,
  },
});

router.post("/confirmPin", async (req, res) => {
  const pin = req.body.pin;
  if (typeof pin !== "string" && typeof pin !== "number") {
    res.status(400).send("malicious PIN!");
    return;
  }

  confirmPin(pin.toString(), req.user.uid).then((feedback) =>
    res.send(feedback)
  );
});
// router endpoints
router.post("/intents", async (req, res) => {
  try {
    // create a PaymentIntent
    const customers = await stripe.customers.list({
      limit: 1,
      email: req.user.email.toLowerCase()
    });
    

    const paymentIntent = await stripe.paymentIntents.create({
      amount: req.body.amount,
      currency: "sgd",
      payment_method_types: ["card"],
      customer: customers.data[0].id,
    });

    if (paymentIntent.error) {
      res.status(500).send({
        message: "Something went wrong " + paymentIntent.error,
      });
    }

    res.status(200).send({
      client_secret: paymentIntent.client_secret,
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
    if (req.user === null) {
      res.status(400).send("not logged in");
      return;
    }
    if (req.user.account_id == null) {
      res.status(400).send({
        message: "No bank account so cannot withdraw",
      });
      return;
    }
    const { amount, pin } = req.body;
    if (typeof amount !== "number" || amount <= 0) {
      res.status(400).send("malicious number!");
      return;
    }
    if (typeof pin !== "string" && typeof pin !== "number") {
      res.status(400).send("malicious PIN!");
      return;
    }
    const balance = await getUserBalance(req.user.uid);
    if (balance < amount) {
      res.status(400).send("not enough balance!");
      return;
    }
    // create a PaymentIntent
    const customers = await stripe.customers.list({
      limit: 1,
      email: req.user.email,
    });

    const transfer = await stripe.transfers.create({
      amount: amount * 100,
      currency: "sgd",
      destination: req.user.account_id,
    });

    if (transfer.error) {
      res.status(500).send({
        message: "Something went wrong" + transfer.error,
      });
      return;
    }
    confirmPin(pin.toString(), req.user.uid).then((feedback) => {
      if (feedback.message === "success") {
        deductBalance(req.user.uid, amount)
          .then(async () => {
            const guardianId = await getUserGuardianId(req.user.uid);
            const guardianEmail = await getUserEmail(guardianId);
            if (guardianId && guardianEmail) {
              const info = await transporter.sendMail({
                from: '"TiKTok Hackathon" <tiktok.hackathon@gmail.com>',
                to: guardianEmail,
                subject: `Withdraw Alert (${req.user.fullName})`,
                text: `${req.user.fullName} has withdrawn $${req.body.amount} from his/her account`,
                html: `<div
        class="container"
        style="max-width: 90%; margin: auto; padding-top: 20px">
        <h2>${req.user.fullName}'s Withdraw Alert</h2>
        <p style="margin-bottom: 10px;">${req.user.fullName} has withdrawn $${req.body.amount} from his/her account</p>
        <p style="margin-bottom: 10px;">You received this email, because you are the guardian of ${req.user.fullName}</p>
        </div>`,
              });
            }
            res.send({
              message: "success",
            });
          })
          .catch(() =>
            res.status(500).send({
              message: "failed",
            })
          );
      } else {
        res.send(feedback);
      }
    });
  } catch (e) {
    res.status(400).send({
      message: e.message,
    });
  }
});

router.get("/balance", async (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }
  const customers = await stripe.customers.list({
    limit: 1,
    email: req.user.email,
  });
  if(customers.length > 0) {
    const charges = await stripe.charges.list({
      limit: 1,
      customer: customers.data[0].id
    });
    let totalRisk = 0;
    charges.data.forEach((charge, index) => {
      totalRisk += charge.outcome.risk_score
    })
    let finalScore = charges.data.length === 0 ? 0 : totalRisk / charges.data.length;
    setUserScore(req.user.uid, finalScore);
  }
  

  const charges = await stripe.charges.list({
    limit: 1,
    customer: customers.data[0].id,
  });
  let totalRisk = 0;
  charges.data.forEach((charge, index) => {
    totalRisk += charge.outcome.risk_score;
  });
  let finalScore =
    charges.data.length === 0 ? 0 : totalRisk / charges.data.length;
  setUserScore(req.user.uid, finalScore);
  getUserBalance(req.user.uid).then((balance) => {
    res.send({
      balance: balance,
    });
  });
});

router.post("/topup", (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }
  const { amount, pin } = req.body;
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).send("malicious number!");
    return;
  }
  if (typeof pin !== "string" && typeof pin !== "number") {
    res.status(400).send("malicious PIN!");
    return;
  }

  confirmPin(pin.toString(), req.user.uid).then((feedback) => {
    if (feedback.message !== "success") {
      res.send(feedback);
      return;
    }
    topupBalance(req.user.uid, amount)
      .then(async () => {
        const guardianId = await getUserGuardianId(req.user.uid);
        const guardianEmail = await getUserEmail(guardianId);
        if (guardianId && guardianEmail) {
          const info = await transporter.sendMail({
            from: '"TiKTok Hackathon" <tiktok.hackathon@gmail.com>',
            to: guardianEmail,
            subject: `Top Up Alert (${req.user.fullName})`,
            text: `${req.user.fullName} has topped up $${req.body.amount} to his/her account`,
            html: `<div
        class="container"
        style="max-width: 90%; margin: auto; padding-top: 20px">
        <h2>${req.user.fullName}'s Top Up Alert</h2>
        <p style="margin-bottom: 10px;">${req.user.fullName} has topped up $${req.body.amount} to his/her account</p>
        <p style="margin-bottom: 10px;">You received this email, because you are the guardian of ${req.user.fullName}</p>
        </div>`,
          });
        }
        res.send({
          message: "success",
        });
      })
      .catch(() =>
        res.status(500).send({
          message: "failed",
        })
      );
  });
});

router.get("/find-users", (req, res) => {
  const { email, name } = req.query;
  if (email !== undefined && typeof email !== "string") {
    res.status(400).send({
      message: "malicious email!",
    });
    return;
  }
  if (name !== undefined && typeof name !== "string") {
    res.status(400).send({
      message: "malicious name!",
    });
    return;
  }
  if (email === undefined && name === undefined) {
    res.status(400).send({
      message: "Either email or name must be provided!",
    });
  }
  getUserFrom(email, name).then((users) => {
    if (users) {
      res.send({
        users: Object.values(users).map((user) => ({
          email: user.email,
          name: user.fullName,
          uid: user.uid,
          risk: user.risk_score,
        })),
      });
    } else {
      res.send({
        users: [],
      });
    }
  });
});

router.post("/transfer", (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }

  const { uid, amount, pin } = req.body;
  if (typeof uid !== "string") {
    res.status(400).send({
      message: "malicious uid!",
    });
    return;
  }
  if (typeof amount !== "number" || amount <= 0) {
    res.status(400).send({
      message: "malicious amount!",
    });
    return;
  }
  if (typeof pin !== "string" && typeof pin !== "number") {
    res.status(400).send({
      message: "malicious PIN!",
    });
    return;
  }

  confirmPin(pin.toString(), req.user.uid).then((feedback) => {
    if (feedback.message === "success") {
      getUserBalance(req.user.uid).then((balance) => {
        if (balance < amount) {
          res.status(400).send({
            message: "not enough balance!",
          });
          return;
        }
        transferAmount(req.user.uid, uid, amount)
          .then(async () => {
            const guardianId = await getUserGuardianId(req.user.uid);
            const guardianEmail = await getUserEmail(guardianId);
            const recieverName = await getUserName(uid);
            if (guardianId && guardianEmail && recieverName) {
              const info = await transporter.sendMail({
                from: '"TiKTok Hackathon" <tiktok.hackathon@gmail.com>',
                to: guardianEmail,
                subject: `Transfer Alert (${req.user.fullName})`,
                text: `${req.user.fullName} has transferred $${req.body.amount} to ${recieverName}`,
                html: `<div
        class="container"
        style="max-width: 90%; margin: auto; padding-top: 20px">
        <h2>${req.user.fullName}'s Top Up Alert</h2>
        <p style="margin-bottom: 10px;">${req.user.fullName} has transferred $${req.body.amount} to his/her account</p>
        <p style="margin-bottom: 10px;">You received this email, because you are the guardian of ${req.user.fullName}</p>
        </div>`,
              });
            }
            res.send({
              message: "success",
            });
          })
          .catch(() => {
            res.send({
              message: "failed",
            });
          });
      });
    } else {
      res.send(feedback);
    }
  });
});

router.get("/transactions", (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }
  getTransactionsByUser(req.user.uid).then((transactions) => {
    if (transactions) {
      res.send({
        transactions: transactions,
      });
    } else {
      res.send({
        transactions: [],
      });
    }
  });
});

export default router;
