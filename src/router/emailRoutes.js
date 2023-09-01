import express from "express";
// import emailjs from "emailjs-com";
import { generateOTP } from "../services/otp.js";
import nodemailer from "nodemailer";

const router = express.Router();

const transporter = nodemailer.createTransport({
  service: process.env.NODE_MAILER_SERVICE,
  host: process.env.NODE_MAILER_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.NODE_MAILER_USER,
    pass: process.env.NODE_MAILER_PASS,
  },
});

// router endpoints
router.post("/send", async (req, res) => {
  try {
    const info = await transporter.sendMail({
      from: '"TiKTok Hackathon 👻" <tiktok.hackathon@gmail.com>', // sender address
      to: req.body.to_email, // list of receivers
      subject: "Account Verification", // Subject line
      text: `Confirmation for topping up ${
        req.body.amount
      } with ${generateOTP()}`,
      html: `<b>${generateOTP()}</b>`, // html body
    });

    // Return the secret
    res.json({ message: "Successfully send a verification email" });
  } catch (e) {
    res.status(400).json({
      error: e.message,
    });
  }
});

export default router;
