const express = require('express');
const serverless = require('serverless-http');
const mongoose = require('mongoose');
const cors = require('cors');
const fileUpload = require('express-fileupload');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors({
    origin: "https://service-sync-frontend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
}));
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(fileUpload());
app.use(express.static('public'));

// 🛑 Ensure Mongoose connects once (cold start safe)
let isConnected = false;

const connectDB = async () => {
    if (isConnected) return;

    try {
        const db = await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        isConnected = db.connections[0].readyState === 1;
        console.log("✅ MongoDB connected");
    } catch (err) {
        console.error("❌ MongoDB error:", err);
    }
};

// Ensure DB connected before any request
app.use(async (req, res, next) => {
    await connectDB();
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

// Routes
app.get("/", (req, res) => {
    res.send("🟢 Hello from Express API deployed on Vercel!");
});

app.use("/customer", custRouter);
app.use("/employee", empRouter);
app.use("/empser", empSerRouter);
app.use("/feedback", feedbackRouter);
app.use("/service", serviceRouter);
app.use("/order", orderRouter);
app.use("/addOn", addOnRouter);
app.use("/login", loginRouter);
app.use("/admin", adminRouter);

// ✅ Correct serverless export
module.exports = serverless(app);
