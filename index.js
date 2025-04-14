const express = require('express');
const app = express();
const serverless = require('serverless-http');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const cors = require('cors');
require('dotenv').config();

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

// Middlewares
app.use(cors({
  origin: "https://servicesync-frontend.vercel.app",
  methods: ["GET", "POST", "PUT", "DELETE"]
}));

app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

TZ = 'Asia/Calcutta';

// MongoDB Connect (avoid reconnecting on every call)
let isConnected = false;

const connectToDatabase = async () => {
  if (isConnected) return;
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  isConnected = true;
  console.log("✅ MongoDB connected");
};

connectToDatabase().catch(console.error);

// Test Route
app.get('/ping', (req, res) => {
  res.send("pong");
});

// Main Routes
app.use("/customer", custRouter);
app.use("/employee", empRouter);
app.use("/empser", empSerRouter);
app.use("/feedback", feedbackRouter);
app.use("/service", serviceRouter);
app.use("/order", orderRouter);
app.use("/addOn", addOnRouter);
app.use("/login", loginRouter);
app.use("/admin", adminRouter);

// Default export for Vercel
module.exports = serverless(app);
