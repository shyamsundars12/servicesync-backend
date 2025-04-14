
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
    port: 465,               // true for 465, false for other ports
    host: process.env.EMAIL_HOST,
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
    secure: true,
});
module.exports = transporter;