import express from 'express';
import { clearSession, createUser, signIn, changeEmail, changePassword } from '../database/db.js';

const router = express.Router();

router.post('/register', (req, res) => {
    const { email, password, fullName, pin } = req.body;
    if (typeof email !== 'string' || typeof password !== 'string' || typeof fullName !== 'string') {
        res.status(400).send('malicious email/password');
        return;
    }
    
    createUser(email, password, fullName, pin)
        .then(user => {
            if (user.message === 'success') {
                res.cookie('session', user.session);
                console.log('register uid: ' + user.uid)
                res.send({
                    fullName: user.fullName,
                    email: user.email,
                    walletId: user.walletId,
                    message: user.message,
                    pin: user.pin,
                    uid: user.uid
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
            console.log(userInfo);
            if (userInfo !== 'failed') {
                console.log('login uid: ' + userInfo.uid)
                res.cookie('session', userInfo.session);
                res.send({
                    message: 'success',
                    email: userInfo.email,
                    walletId: userInfo.walletId,
                    fullName: userInfo.fullName,
                    uid: userInfo.uid,
                    photoUrl: userInfo.photoUrl,
                    phoneNumber: userInfo.phoneNumber
                });
            } else {
                res.send({
                    message: 'Authentication failed',
                });
            }
        })
        .catch((error) => {
            console.log(' at catch: ' + error)
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
    console.log(req.user);
    res.send({
        status: req.user !== null,
        user: req.user
    });
})

router.post('/update-email', (req, res) => {
    const { currentEmail, password, newEmail } = req.body;
    changeEmail(currentEmail, password, newEmail)
        .then((feedback) => {
            console.log(feedback)
            console.log(feedback.message)
            if (feedback.message == 'success') {
                res.send({
                    message: 'success',
                    newEmail: newEmail
                })
            } else {
                res.send({
                    message: 'failed to update email'
                });
            }
        })
        .catch(() => {
            res.status(500).send({
                message: 'failed to update email'
            });
        });
})

router.post('/update-password', (req, res) => {
    const { email, currentPassword, newPassword } = req.body;
    changePassword(email, currentPassword, newPassword)
        .then((feedback) => {
            if (feedback.message == 'success') {
                res.send({
                    message: 'success'
                })
            } else {
                res.send({
                    message: 'failed to update email'
                });
            }
        })
        .catch(() => {
            res.status(500).send({
                message: 'failed to update email'
            });
        });
})




export default router;