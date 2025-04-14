const express = require('express');
const serverless = require('serverless-http'); // Vercel handler
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

const app = express();

// === Middleware ===
app.use(cors({
  origin: 'https://servicesync-frontend.vercel.app/',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
}));
app.use(express.json());
app.use(fileUpload());
app.use(express.static('public'));

// === MongoDB Connection (optimized for serverless) ===
let isDbConnected = false;
const connectToMongo = async () => {
  if (!isDbConnected) {
    try {
      await mongoose.connect(process.env.MONGO_URI, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ MongoDB connected');
      isDbConnected = true;
    } catch (err) {
      console.error('❌ MongoDB connection error:', err);
    }
  }
};
connectToMongo();

// === Routes ===
app.get('/api/', (req, res) => {
  res.send("✅ Hello from Serverless Express API!");
});

app.use('/api/customer', custRouter);
app.use('/api/employee', empRouter);
app.use('/api/empser', empSerRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/service', serviceRouter);
app.use('/api/order', orderRouter);
app.use('/api/addOn', addOnRouter);
app.use('/api/login', loginRouter);
app.use('/api/admin', adminRouter);

// === Export Handler for Vercel ===
module.exports = serverless(app);
