const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
  origin: "https://servicesync-frontend.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// ⚠️ Vercel fix: Ensure MongoDB is connected per request (cold start safe)
const connectToDatabase = async () => {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB connected");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
  }
};

// Test Route (lightweight)
app.get('/ping', async (req, res) => {
  res.send("pong ✅");
});

// Dynamic Database Connect Wrapper
app.use(async (req, res, next) => {
  await connectToDatabase();
  next();
});

// Routers
const custRouter = require('./src/router/customerRouter');
const empRouter = require('./src/router/employeeRouter');
const empSerRouter = require('./src/router/employeeServiceRouter');
const feedbackRouter = require('./src/router/feedbackRouter');
const serviceRouter = require('./src/router/serviceRouter');
const orderRouter = require('./src/router/orderRouter');
const addOnRouter = require('./src/router/addOnRouter');
const loginRouter = require('./src/router/loginRouter');
const adminRouter = require('./src/router/adminRouter');

// Route Handlers
app.use("/customer", custRouter);
app.use("/employee", empRouter);
app.use("/empser", empSerRouter);
app.use("/feedback", feedbackRouter);
app.use("/service", serviceRouter);
app.use("/order", orderRouter);
app.use("/addOn", addOnRouter);
app.use("/login", loginRouter);
app.use("/admin", adminRouter);

// Export for Vercel serverless functions
module.exports = serverless(app);
