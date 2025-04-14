const express = require('express');
const app = express();
const serverless = require('serverless-http'); // Add serverless-http

var bodyParser = require('body-parser');
const mongoose = require('mongoose');
const fileUpload = require('express-fileupload');
const multer = require('multer');
const custRouter = require('./src/router/customerRouter');
const empRouter = require('./src/router/employeeRouter');
const empSerRouter = require('./src/router/employeeServiceRouter');
const feedbackRouter = require('./src/router/feedbackRouter');
const serviceRouter = require('./src/router/serviceRouter');
const orderRouter = require('./src/router/orderRouter');
const addOnRouter = require('./src/router/addOnRouter');
const loginRouter = require('./src/router/loginRouter');
const adminRouter = require('./src/router/adminRouter');
require('dotenv').config();
const cors = require('cors');

// Enable CORS
app.use(cors({
    origin: "https://service-sync-frontend.vercel.app",
    methods: ["GET", "POST", "PUT", "DELETE"],
}));

// Set up Express middleware
app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
TZ = 'Asia/Calcutta';
app.use(fileUpload());
app.use(express.static('public'));

// MongoDB Connection
const url = process.env.MONGO_URI;
mongoose.connect(url)
    .then(() => {
        console.log("Connected to DB");
    })
    .catch((err) => {
        console.log(err);
    });

// Basic route
app.get('/', (req, res) => {
    res.send("Hello from Express API!!!");
});

// Using Routers
app.use("/customer", custRouter);
app.use("/employee", empRouter);
app.use("/empser", empSerRouter);
app.use("/feedback", feedbackRouter);
app.use("/service", serviceRouter);
app.use("/order", orderRouter);
app.use("/addOn", addOnRouter);
app.use("/login", loginRouter);
app.use("/admin", adminRouter);

// Export the handler to work with serverless environments
module.exports.handler = serverless(app);  // This is crucial for Vercel to handle serverless functions
