import express from "express";
import {
  clearSession,
  createUser,
  signIn,
  setUserGuardianId,
  getUserGuardianId,
  validateUserGuardianPassword,
  getUserName,
} from "../database/db.js";
import Stripe from "stripe";
const router = express.Router();
const stripe = Stripe(process.env.STRIPE_PASS);
router.post("/register", async (req, res) => {
  const { email, password, fullName, pin } = req.body;
  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    typeof fullName !== "string"
  ) {
    res.status(400).send("malicious email/password");
    return;
  }

  const customer = await stripe.customers.create({
    email: email,
  });

  const account = await stripe.accounts.create({
    type: "express",
    country: "SG",
    capabilities: {
      card_payments: {
        requested: true,
      },
      transfers: {
        requested: true,
      },
    },
  });
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: "https://example.com/reauth",
    return_url: "https://example.com/return",
    type: "account_onboarding",
  });

  createUser(email, password, fullName, pin, account.id, accountLink.url).then(
    (user) => {
      if (user.message === "success") {
        res.cookie("session", user.session);
        console.log(accountLink.url);
        res.send({
          fullName: user.fullName,
          email: user.email,
          walletId: user.walletId,
          message: user.message,
          pin: user.pin,
          customer_id: customer.id,
          account_id: user.account_id,
          account_link: accountLink.url,
        });
      } else {
        res.send({
          message: user.message,
        });
      }
    }
  );
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (typeof email !== "string" || typeof password !== "string") {
    res.status(400).send("malicious email/password");
    return;
  }
  signIn(email, password)
    .then((userInfo) => {
      if (userInfo !== "failed") {
        res.cookie("session", userInfo.session);
        res.send({
          message: "success",
          email: userInfo.email,
          walletId: userInfo.walletId,
          fullName: userInfo.fullName,
          account_id: userInfo.account_id ? userInfo.account_id : "",
        });
      } else {
        res.send({
          message: "Authentication failed",
        });
      }
    })
    .catch(() => {
      res.status(500).send({
        message: "failed to log in",
      });
    });
});

router.get("/logout", (req, res) => {
  if (req.user !== null) {
    clearSession(req.user.session).then((feedback) => {
      res.clearCookie("session");
      res.send(feedback);
    });
  } else {
    res.send({
      status: req.user !== null,
      user: req.user,
    });
  }
});

router.get("/is-logged-in", (req, res) => {
  res.send({
    status: req.user !== null,
    user: req.user !== null ? req.user : null
  });
});

router.get("/is-guarded", async (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }
  const guardianId = await getUserGuardianId(req.user.uid);
  const guadianName = await getUserName(guardianId);
  if (!guardianId) {
    res.status(200).send({
      message: "",
    });
    return;
  } else {
    res.status(200).send({
      message: guadianName,
    });
    return;
  }
});

router.post("/set-guardian", async (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }

  const guardianId = await getUserGuardianId(req.user.uid);
  if (guardianId) {
    const result = await validateUserGuardianPassword(
      req.user.uid,
      req.body.password
    );
    if (!result) {
      res.status(400).json({ error: "Password is incorrect" });
      return;
    }
  }

  await setUserGuardianId(
    req.user.uid,
    req.body.guardianId,
    req.body.newPassword
  ).catch((e) => {
    res.status(400).send({
      message: "fail to set guardian",
    });
    return;
  });

  // Return the secret
  res.status(200).json({ message: "Set guardian sucessfully" });
});

export default router;
