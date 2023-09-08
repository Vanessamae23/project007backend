import express from "express";
// import emailjs from "emailjs-com";
import { generateOTP, generateReferenceCode } from "../services/otp.js";
import nodemailer from "nodemailer";
import { setUserOTP, getUserOTP } from "../database/db.js";

const router = express.Router();

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

// generate otp
router.post("/send", async (req, res) => {
  if (req.user === null) {
    res.status(400).send({
      message: "not logged in",
    });
    return;
  }

  // Generate a secret
  const otp = generateOTP();
  const referenceCode = generateReferenceCode();
  setUserOTP(req.user.uid, otp);
  const info = await transporter.sendMail({
    from: '"TiKTok Hackathon" <tiktok.hackathon@gmail.com>',
    to: req.user.email,
    subject: "Account Verification",
    text: `${req.user.fullName}'s Verification OTP: ${otp} (Reference Code: ${referenceCode}))`,
    html: `<div
    class="container"
    style="max-width: 90%; margin: auto; padding-top: 20px">
    <h2>${req.user.fullName}'s Verification</h2>
    <p style="margin-bottom: 10px;">Please enter the sign up OTP to continue in our application</p>
    <p style="margin-bottom: 30px;">Reference Code: ${referenceCode}</p>
    <h1 style="font-size: 40px; letter-spacing: 2px; text-align:center;">${otp}</h1>
    </div>`,
  });

  // Return the secret
  res.status(200).json({ message: referenceCode });
});

// validate otp
router.post("/verify", async (req, res) => {
  try {
    const otp = await getUserOTP(req.user.uid);
    if (otp == req.body.otp) {
      res.status(200).json({ message: "Successfully verified" });
    } else {
      res.status(400).json({ message: `OTP is not correct, please try again` });
    }
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

export default router;
