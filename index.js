const express = require('express');
const app = express();
const serverless = require('serverless-http'); // For Vercel serverless support

const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');

require('dotenv').config();
const cors = require('cors');

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

// Middleware
app.use(cors({
    origin: "https://service-sync-frontend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// MongoDB connection
const url = process.env.MONGO_URI;
mongoose.connect(url)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => console.log("❌ MongoDB connection error:", err));

// Test route
app.get('/', (req, res) => {
    res.send("Hello from Express API!!!");
});

// API Routes
app.use("/customer", custRouter);
app.use("/employee", empRouter);
app.use("/empser", empSerRouter);
app.use("/feedback", feedbackRouter);
app.use("/service", serviceRouter);
app.use("/order", orderRouter);
app.use("/addOn", addOnRouter);
app.use("/login", loginRouter);
app.use("/admin", adminRouter);

// ✅ Correct default export for Vercel serverless
module.exports = serverless(app);
