import express from "express";
// import emailjs from "emailjs-com";
import { generateOTP } from "../services/otp.js";
import nodemailer from "nodemailer";
import { setUserOTP, getUserOTP, getUserInfo } from "../database/db.js";

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
  try {
    // Generate a secret
    const { uid } = req.cookies;
    const userInfo = await getUserInfo(uid);
    const otp = generateOTP();
    setUserOTP(uid, otp);
    const info = await transporter.sendMail({
      from: '"TiKTok Hackathon" <tiktok.hackathon@gmail.com>',
      to: userInfo.email,
      subject: "Account Verification",
      text: `${userInfo.fullName}'s Transaction Verification OTP: ${otp}`,
      html: `<div
      class="container"
      style="max-width: 90%; margin: auto; padding-top: 20px">
      <h2>${userInfo.fullName}'s Transaction Verification</h2>
      <p style="margin-bottom: 30px;">Pleas enter the sign up OTP to continue in our application</p>
      <h1 style="font-size: 40px; letter-spacing: 2px; text-align:center;">${otp}</h1>
      </div>`,
    });

    // Return the secret
    res.json({ message: "Successfully send a verification email" });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

// validate otp
router.post("/verify", async (req, res) => {
  try {
    const { uid } = req.cookies;
    const otp = await getUserOTP(uid);
    if (otp === req.body.otp) {
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
