import express from 'express';
import { clearSession, createUser, signIn } from '../database/db.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const { email, password, fullName } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
        res.status(400).send('malicious email/password');
        return;
    }
    createUser(email, password, fullName)
        .then(user => {
            if (user.message === 'success') {
                res.cookie('session', user.session);
                res.send({
                    fullName: user.fullName,
                    email: user.email,
                    message: user.message,
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