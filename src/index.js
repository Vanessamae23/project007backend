import express from 'express';
import payRoutes from './router/payRoutes.js';
import authRoutes from './router/authRoutes.js';
import profileRoutes from "./router/profileRoutes.js"
import emailRoutes from './router/emailRoutes.js';
import { verifyUser } from './middleware/authMiddleware.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT;
app.use(bodyParser.json());
app.use(cookieParser());
app.use(verifyUser);

app.get("/", (req, res) => {
  res.send("<h2>Hello world!</h2>");
});

app.use("/payments", payRoutes);
app.use("/auth", authRoutes);
app.use("/email", emailRoutes);
app.use("/profile", profileRoutes);

app.listen(PORT, () => {
  console.log("API is listening on port", PORT);
});
