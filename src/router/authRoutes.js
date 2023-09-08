import express from 'express';
import { clearSession, createUser, signIn } from '../database/db.js';
import Stripe from "stripe";
const router = express.Router();
const stripe = Stripe(process.env.STRIPE_PASS);
router.post('/register', async (req, res) => {
    const { email, password, fullName, pin } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
        res.status(400).send('malicious email/password');
        return;
    }

    
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'SG',
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
      refresh_url: 'https://example.com/reauth',
      return_url: 'https://example.com/return',
      type: 'account_onboarding',
    });
    
    createUser(email, password, fullName, pin, account.id, accountLink.url)
        .then(user => {
            if (user.message === 'success') {
                res.cookie('session', user.session);
                console.log(accountLink.url)
                res.send({
                    fullName: user.fullName,
                    email: user.email,
                    walletId: user.walletId,
                    message: user.message,
                    pin: user.pin,
                    account_id: user.account_id,
                    account_link: accountLink.url
                });
            } else {
                res.send({
                    message: user.message,
                });
            }
        });
})

router.post('/login', (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string') {
        res.status(400).send('malicious email/password');
        return;
    }
    signIn(email, password)
        .then(userInfo => {
            if (userInfo !== 'failed') {
                res.cookie('session', userInfo.session);
                res.send({
                    message: 'success',
                    email: userInfo.email,
                    walletId: userInfo.walletId,
                    fullName: userInfo.fullName,
                    account_id: userInfo.account_id ? userInfo.account_id : ""
                });
            } else {
                res.send({
                    message: 'Authentication failed',
                });
            }
        })
        .catch(() => {
            res.status(500).send({
                message: 'failed to log in',
            });
        });
});

router.get('/logout', (req, res) => {
    if (req.user !== null) {
        clearSession(req.user.session)
            .then(feedback => {
                res.clearCookie('session');
                res.send(feedback);
            });
    } else {
        res.status(400).send({
            message: 'not logged in',
        });
    }
});

router.get('/is-logged-in', (req, res) => {
    res.send({
        status: req.user !== null,
    });
})

export default router;