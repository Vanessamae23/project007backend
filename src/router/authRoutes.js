import express from 'express';
import { createUser, isLoggedIn, signIn } from '../database/db.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const { email, password, fullName } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
        res.status(400).send('malicious email/password');
        return;
    }
    createUser(email, password, fullName)
        .then(feedback => {
            res.cookie('uid', feedback.uid);
            res.send({
                fullName: feedback.fullName,
                email: feedback.email,
                message: feedback.message,
            });
        })
        .catch(() => {
            res.status(500).send({
                message: 'failed to register'
            });
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
                res.cookie('uid', userInfo.uid);
                res.send({
                    message: 'success',
                    email: userInfo.email,
                    fullName: userInfo.fullName,
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
    res.cookie('uid', '');
    res.send({
        message: 'success'
    });
});

router.get('/is-logged-in', (req, res) => {
    const { uid } = req.cookies;
    isLoggedIn(uid).then(ans => {
        res.send({
            status: ans
        });
    });
})

export default router;