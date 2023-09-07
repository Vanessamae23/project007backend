import express from 'express';
import { saveUserProfileWImage, saveUserProfile } from '../database/db.js';

const router = express.Router();

router.post("/saveWithImage", async (req, res) => {
    // user sets up profile image
    const { fullName, email, phoneNumber, uri } = req.body;

    // // Validate the imageUri
    // if (!validator.isURL(imageUri) || !validator.isImage(imageUri)) {
    //     res.status(400).send('Invalid image URI.');
    //     return;
    // }

    saveUserProfileWImage(fullName, email, phoneNumber, uri, req.user.uid)
        .then(feedback => {
            //console.log(feedback);
            res.send({
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber,
                photoUrl: feedback.photoUrl,
                message: feedback.message,
                uid: req.user.uid
            });
            console.log(res.json())
        })
        .catch(error => {
            console.error('Error saving image:', error);
            res.status(500).send({
                message: 'Failed to upload the image.'
            });
        });
});

router.post("/saveWithoutImage", async (req, res) => {


    const { fullName, email, phoneNumber } = req.body;
    const { uid } = req.cookies;

    // // Validate the imageUri
    // if (!validator.isURL(imageUri) || !validator.isImage(imageUri)) {
    //     res.status(400).send('Invalid image URI.');
    //     return;
    // }

    saveUserProfile(fullName, email, phoneNumber, uid)
        .then(feedback => {
            //console.log(feedback);
            res.send({
                fullName: fullName,
                email: email,
                phoneNumber: phoneNumber,
                message: feedback.message
            });
            console.log(res.json())
        })
        .catch(error => {
            console.error('Error saving profile:', error);
            res.status(500).send({
                message: 'Failed to save profile.'
            });
        });
});

export default router;