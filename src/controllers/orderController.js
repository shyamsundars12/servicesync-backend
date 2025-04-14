const moment = require('moment-timezone');
moment().tz("Asia/Kolkata").format();
const distanceCalc = require('../Helper/distanceFinder')
const OrderModel = require("../models/OrderModel");
const AddOnModel = require("../models/AddOnModel");
const ServiceModel = require("../models/ServiceModel");
const EmpSerModel = require("../models/EmployeeServiceModel");
const EmployeeModel = require("../models/EmployeeModel");
const emailSender = require("../Helper/otpHelper")
const { default: mongoose } = require("mongoose");
const CustomerModel = require('../models/CustomerModel');
const { response } = require('express');
const razorpay = require('../config/razorpay');

module.exports = {
    checkAvailability: async (req, res) => {
        try {
            const serId = req.body?.serId || req.body?.body?.serId;
            const date = req.body?.date || req.body?.body?.date;
            const time = req.body?.time || req.body?.body?.time;
            
            if (!serId || !date || !time) {
                const error = { message: false, error: "Missing required parameters" };
                if (res) {
                    return res.json(error);
                }
                return error;
            }

            // Get service durationss
            const service = await ServiceModel.findById(serId, { time: true });
            if (!service) {
                const error = { message: false, error: "Service not found" };
                if (res) {
                    return res.json(error);
                }
                return error;
            }

            // Get all workers who can perform this service
            const empIdList = await EmpSerModel.distinct("empId", { "serList.serId": serId });
            if (!empIdList.length) {
                const error = { message: false, error: "No workers available for this service" };
                if (res) {
                    return res.json(error);
                }
                return error;
            }

            // Calculate service time window
            const startTime = moment(time, "HH:mm");
            const endTime = moment(startTime).add(service.time, 'minutes');
            
            // Check each worker's availability
            for (const empId of empIdList) {
                const existingOrders = await OrderModel.find({
                    empId: empId,
                    service_date: date,
                    isActive: true,
                    $or: [
                        {
                            $and: [
                                { service_startTime: { $lte: startTime.format("HH:mm:ss") } },
                                { service_endTime: { $gt: startTime.format("HH:mm:ss") } }
                            ]
                        },
                        {
                            $and: [
                                { service_startTime: { $lt: endTime.format("HH:mm:ss") } },
                                { service_endTime: { $gte: endTime.format("HH:mm:ss") } }
                            ]
                        }
                    ]
                });

                if (existingOrders.length === 0) {
                    // Worker is available
                    const success = { 
                        message: true,
                        available: true,
                        empId: empId
                    };
                    if (res) {
                        return res.json(success);
                    }
                    return success;
                }
            }

            // No workers available
            const error = { 
                message: false,
                available: false,
                error: "No workers available for the selected time slot"
            };
            if (res) {
                return res.json(error);
            }
            return error;
        }
        catch (err) {
            console.error("Availability check error:", err);
            const error = {
                message: false,
                error: "Internal server error"
            };
            if (res) {
                return res.status(500).json(error);
            }
            return error;
        }
    },
    createOrder: async (req, res) => {
        try {
            const custId = req.body.custId;
            const address = req.body.address;
            const custLat = req.body.lat;
            const custLng = req.body.lng;

            const customer = await CustomerModel.findById(custId, { cart: true });
            if (!customer) {
                return res.status(404).json({ message: false, error: "Customer not found" });
            }

            address.lat = custLat;
            address.lng = custLng;
            const serList = customer.cart.serList;
            const orderId = moment().unix() * 2;
            
            let createdOrders = [];
            let failedServices = [];

            for (let ser of serList) {
                try {
                    // Check service availability
                    const availabilityCheck = await module.exports.checkAvailability({
                        body: {
                            serId: ser.serId,
                            date: ser.date,
                            time: ser.time
                        }
                    });

                    if (!availabilityCheck.message) {
                        failedServices.push({
                            serviceId: ser.serId,
                            reason: availabilityCheck.error || "Service not available"
                        });
                        continue;
                    }

                    const service = await ServiceModel.findById(ser.serId);
                    if (!service) {
                        failedServices.push({
                            serviceId: ser.serId,
                            reason: "Service not found"
                        });
                        continue;
                    }

                    // Calculate service end time
                    const startTime = moment(ser.time, "HH:mm");
                    const endTime = moment(startTime).add(service.time, 'minutes');

                    // Create order
                    const order = new OrderModel({
                        custId: custId,
                        serId: ser.serId,
                        orderId: orderId,
                        empId: availabilityCheck.empId,
                        booking_datetime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        service_startTime: startTime.format('HH:mm:ss'),
                        service_endTime: endTime.format('HH:mm:ss'),
                        service_date: ser.date,
                        address: address,
                        payment_mode: req.body.payment_method || "Cash",
                        amount: service.price - (req.body.discount || 0),
                        status: "assigned",
                        promocode: req.body.promocode || null,
                        isActive: true
                    });

                    const savedOrder = await order.save();
                    createdOrders.push(savedOrder);

                } catch (error) {
                    console.error(`Error creating order for service ${ser.serId}:`, error);
                    failedServices.push({
                        serviceId: ser.serId,
                        reason: "Internal error"
                    });
                }
            }

            // Prepare response
            const response = {
                message: true,
                createdOrders: createdOrders.length,
                failedServices: failedServices.length,
                orderId: orderId,
                status: createdOrders.length === serList.length ? "success" : "partial",
                details: {
                    created: createdOrders.map(o => o.serId),
                    failed: failedServices
                }
            };

            // If no orders were created, delete any partial orders
            if (createdOrders.length === 0) {
                await OrderModel.deleteMany({ orderId: orderId });
                response.status = "failed";
            }

            res.json(response);

        } catch (err) {
            console.error("Order creation error:", err);
            res.status(500).json({
                message: false,
                error: "Internal server error"
            });
        }
    },
    test: async (req, res) => {
        try {
            // console.log(moment().unix());
            res.send("he;;pw");
        }
        catch (err) {
            res.send(err);
        }
    },
    getOrder: async (req, res) => {
        try {
            const order = await OrderModel.find({});
            res.json(order);
        }
        catch (err) {
            res.json({
                message: err
            });
        }
    },

    getOrderById: async (req, res) => {
        try {
            const order = await OrderModel.find({ orderId: req.body.orderId });
            res.json(order);
        }
        catch (err) {
            res.json({
                message: err
            });
        }
    },
    getOrderByCustId: async (req, res) => {

        try {

            const custId = req.body.custId;
            const completedOrders = await OrderModel.aggregate(
                [
                    { $match: { custId: new mongoose.Types.ObjectId(custId), status: { $not: { $eq: "assigned" } } } },
                    { $sort: { service_date: -1 } },

                    {
                        $lookup: {
                            from: "services",
                            localField: "serId",
                            foreignField: "_id",
                            as: "serviceDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "employees",
                            localField: "empId",
                            foreignField: "_id",
                            as: "employeeDetails",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            serId: 1,
                            empId: 1,
                            custId: 1,
                            status: 1,
                            amount: 1,
                            service_startTime: 1,
                            service_endTime: 1,
                            service_date: 1,
                            payment_mode: 1,
                            booking_datetime: 1,
                            feedActive: 1,
                            "serviceDetails.name": 1,
                            "serviceDetails.price": 1,
                            "serviceDetails.avgRating": 1,
                            "serviceDetails.url": 1,
                            "serviceDetails.url": 1,
                            "employeeDetails.fname": 1,
                            "employeeDetails.lname": 1,
                            "employeeDetails.contact_no": 1,
                            "employeeDetails.rating": 1,

                        }
                    }

                ],
            )
            const pendingOrders = await OrderModel.aggregate(
                [
                    { $match: { custId: new mongoose.Types.ObjectId(custId), status: "assigned" } },
                    { $sort: { service_date: -1 } },

                    {
                        $lookup: {
                            from: "services",
                            localField: "serId",
                            foreignField: "_id",
                            as: "serviceDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "employees",
                            localField: "empId",
                            foreignField: "_id",
                            as: "employeeDetails",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            serId: 1,
                            empId: 1,
                            custId: 1,
                            status: 1,
                            amount: 1,
                            service_startTime: 1,
                            service_endTime: 1,
                            service_date: 1,
                            payment_mode: 1,
                            booking_datetime: 1,
                            "serviceDetails.name": 1,
                            "serviceDetails.price": 1,
                            "serviceDetails.avgRating": 1,
                            "serviceDetails.url": 1,
                            "serviceDetails.url": 1,
                            "employeeDetails.fname": 1,
                            "employeeDetails.lname": 1,
                            "employeeDetails.contact_no": 1,
                            "employeeDetails.rating": 1,

                        }
                    }

                ],
            )
            // console.log(completedOrders)
            res.json({ completedOrders: completedOrders, pendingOrders: pendingOrders });
        }
        catch (err) {
            console.log(err)
            res.json({
                message: err
            });
        }
    },
    getOrderTodayByEmpId: async (req, res) => {
        try {
            const empId = req.body.empId;
            const date = moment().format('YYYY-MM-DD');
            
            const pendingOrders = await OrderModel.aggregate([
                { 
                    $match: { 
                        empId: new mongoose.Types.ObjectId(empId), 
                        service_date: date, 
                        status: { $in: ["assigned", "confirmed"] },
                        isActive: true
                    } 
                },
                { $sort: { service_date: -1 } },
                    {
                        $lookup: {
                            from: "services",
                            localField: "serId",
                            foreignField: "_id",
                            as: "serviceDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "customers",
                            localField: "custId",
                            foreignField: "_id",
                            as: "customerDetails",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            serId: 1,
                            empId: 1,
                            custId: 1,
                            status: 1,
                        totalAmount: 1,
                            amount: 1,
                            service_startTime: 1,
                            service_endTime: 1,
                            service_date: 1,
                        payment_method: 1,
                            booking_datetime: 1,
                        address: 1,
                            "serviceDetails.name": 1,
                            "serviceDetails.price": 1,
                            "serviceDetails.avgRating": 1,
                            "serviceDetails.url": 1,
                            "customerDetails.fname": 1,
                            "customerDetails.lname": 1,
                            "customerDetails.contact_no": 1,
                            "customerDetails.address": 1,
                    }
                }
            ]);

            // Also get upcoming orders
            const upcomingOrders = await OrderModel.aggregate([
                { 
                    $match: { 
                        empId: new mongoose.Types.ObjectId(empId), 
                        service_date: { $gt: date },
                        status: { $in: ["assigned", "confirmed"] },
                        isActive: true
                    } 
                },
                { $sort: { service_date: 1 } },
                {
                    $lookup: {
                        from: "services",
                        localField: "serId",
                        foreignField: "_id",
                        as: "serviceDetails",
                    },
                },
                {
                    $lookup: {
                        from: "customers",
                        localField: "custId",
                        foreignField: "_id",
                        as: "customerDetails",
                    },
                },
                {
                    $project: {
                        _id: 1,
                        orderId: 1,
                        serId: 1,
                        empId: 1,
                        custId: 1,
                        status: 1,
                        totalAmount: 1,
                        amount: 1,
                        service_startTime: 1,
                        service_endTime: 1,
                        service_date: 1,
                        payment_method: 1,
                        booking_datetime: 1,
                        address: 1,
                        "serviceDetails.name": 1,
                        "serviceDetails.price": 1,
                        "serviceDetails.avgRating": 1,
                        "serviceDetails.url": 1,
                        "customerDetails.fname": 1,
                        "customerDetails.lname": 1,
                        "customerDetails.contact_no": 1,
                        "customerDetails.address": 1,
                    }
                }
            ]);

            res.json({ 
                pendingOrders: pendingOrders,
                upcomingOrders: upcomingOrders
            });
        } catch (err) {
            console.error("Error fetching employee orders:", err);
            res.status(500).json({
                success: false,
                error: "Failed to fetch employee orders"
            });
        }
    },
    startService: async (req, res) => {
        try {
            const orderId = req.body.orderId;
            const order = await OrderModel.findById(orderId, { status: true, empId: true })
            if (order == null) {
                res.json({ message: false });
            } else {
                if (order.status === "active") {
                    res.send({ message: false });
                } else {
                    order.status = 'active';
                    await OrderModel.findByIdAndUpdate(orderId, order);
                    res.json({ message: true })
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send("Invalid Action");
        }
    },
    getServiceCompOTP: async (req, res) => {
        try {
            const orderId = req.body.orderId;
            const order = await OrderModel.findById(orderId, { status: true, empId: true })
            if (order == null) {
                res.json({ message: false });
            } else {
                if (order.status === "active") {
                    order.status = 'completed';
                    await OrderModel.findByIdAndUpdate(orderId, order);
                    res.json({ message: true })
                } else {
                    res.send({ message: false });
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send("Invalid Action");
        }
    },
    endService: async (req, res) => {
        try {
            const orderId = req.body.orderId;
            const order = await OrderModel.findById(orderId, { status: true, empId: true })
            if (order == null) {
                res.json({ message: false });
            } else {
                if (order.status === "active") {
                    order.status = 'completed';
                    await OrderModel.findByIdAndUpdate(orderId, order);
                    res.json({ message: true })
                } else {
                    res.send({ message: false });
                }
            }
        } catch (err) {
            console.log(err);
            res.status(400).send("Invalid Action");
        }
    },
    getOrderUpcomingByEmpId: async (req, res) => {
        try {
            const empId = req.body.empId;
            const date = moment().format('YYYY-MM-DD');
            console.log(date)
            const upcomingOrders = await OrderModel.aggregate(
                [
                    { $match: { empId: new mongoose.Types.ObjectId(empId), service_date: { $not: { $eq: date } }, status: "assigned" } },
                    { $sort: { service_date: -1 } },

                    {
                        $lookup: {
                            from: "services",
                            localField: "serId",
                            foreignField: "_id",
                            as: "serviceDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "customers",
                            localField: "custId",
                            foreignField: "_id",
                            as: "customerDetails",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            serId: 1,
                            empId: 1,
                            custId: 1,
                            status: 1,
                            amount: 1,
                            service_startTime: 1,
                            service_endTime: 1,
                            service_date: 1,
                            payment_mode: 1,
                            booking_datetime: 1,
                            "serviceDetails.name": 1,
                            "serviceDetails.price": 1,
                            "serviceDetails.avgRating": 1,
                            "serviceDetails.url": 1,
                            "serviceDetails.url": 1,
                            "customerDetails.fname": 1,
                            "customerDetails.lname": 1,
                            "customerDetails.contact_no": 1,
                            "customerDetails.address": 1,

                        }
                    }

                ],
            )
            // console.log(upcomingOrders)
            res.json({ upcomingOrders: upcomingOrders });
        }
        catch (err) {
            console.log(err)
            res.send(
                err
            );
        }
    },
    createCheckout: async (req, res) => {
        try {
            const { services, custId, address, payment_method, totalAmount, lat, lng } = req.body;

            // Validate required fields
            if (!services || !Array.isArray(services) || services.length === 0) {
                return res.status(400).json({
                    success: false,
                    error: "Services array is required and must not be empty"
                });
            }

            if (!custId) {
                return res.status(400).json({
                    success: false,
                    error: "Customer ID is required"
                });
            }

            if (!address || !address.house_no || !address.society_name || !address.landmark || !address.city || !address.pincode) {
                return res.status(400).json({
                    success: false,
                    error: "Complete address is required"
                });
            }

            if (!payment_method) {
                return res.status(400).json({
                    success: false,
                    error: "Payment method is required"
                });
            }

            // Check service availability for each service
            const availabilityChecks = await Promise.all(services.map(async (service) => {
                try {
                    const check = await ServiceModel.findOne({
                        _id: service.serId,
                        isActive: true
                    });
                    return {
                        serviceId: service.serId,
                        available: !!check,
                        empId: service.empId
                    };
        } catch (error) {
                    console.error(`Error checking service ${service.serId}:`, error);
                    return {
                        serviceId: service.serId,
                        available: false,
                        error: "Failed to check service availability"
                    };
                }
            }));

            const unavailableServices = availabilityChecks.filter(check => !check.available);
            if (unavailableServices.length > 0) {
                return res.status(400).json({
                    success: false,
                    error: "Some services are not available",
                    unavailableServices: unavailableServices.map(s => s.serviceId)
                });
            }

            if (payment_method === 'Razorpay') {
                try {
                    // Validate total amount
                    if (!totalAmount || totalAmount <= 0) {
                        return res.status(400).json({
                            success: false,
                            error: "Invalid total amount"
                        });
                    }

                    // Create Razorpay order
                    const order = await razorpay.orders.create({
                        amount: Math.round(totalAmount * 100), // Amount in paise
                        currency: 'INR',
                        receipt: `order_${Date.now()}`,
                        payment_capture: 1
                    });

                    // Create temporary order record with employee assignments
                    const tempOrder = new OrderModel({
                        orderId: order.id,
                        custId,
                        serId: services[0].serId,
                        services: services.map((service) => ({
                            serId: service.serId,
                            date: service.date,
                            time: service.time,
                            price: service.serviceDetails.price,
                            empId: service.empId,
                            serviceDetails: {
                                price: service.serviceDetails.price,
                                name: service.serviceDetails.name
                            }
                        })),
                        address,
                        lat,
                        lng,
                        totalAmount: totalAmount, // Set totalAmount
                        amount: totalAmount, // Also set amount field
                        payment_method: 'Razorpay', // Set payment method explicitly
                        status: 'pending',
                        isActive: true,
                        booking_datetime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        service_date: services[0].date,
                        service_startTime: services[0].time
                    });

                    await tempOrder.save();

                    return res.json({
                        success: true,
                        orderId: order.id,
                        totalAmount: totalAmount
                    });
                } catch (error) {
                    console.error("Razorpay order creation error:", error);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to create Razorpay order: " + error.message
                    });
                }
            } else if (payment_method === 'Cash') {
                try {
                    // Create orders for each service with employee assignments
                    const orders = await Promise.all(services.map(async (service) => {
                        const order = new OrderModel({
                            orderId: Date.now().toString(),
                            custId,
                            serId: service.serId,
                            empId: service.empId,
                            date: service.date,
                            time: service.time,
                            address,
                            lat,
                            lng,
                            totalAmount: service.serviceDetails.price,
                            payment_method,
                            status: 'confirmed',
                            isActive: true
                        });
                        return await order.save();
                    }));

                    return res.json({
                        success: true,
                        orders: orders.map(order => order._id)
                    });
                } catch (error) {
                    console.error("Cash order creation error:", error);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to create cash order: " + error.message
                    });
                }
            } else {
                return res.status(400).json({
                    success: false,
                    error: "Invalid payment method"
                });
            }
        } catch (error) {
            console.error("Order creation error:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to create order: " + error.message
            });
        }
    },
    
    success: async (req, res) => {
        console.log("Success endpoint called with:", req.body);
        try {
            const { orderId, paymentId } = req.body;
            console.log("Order ID:", orderId, "Payment ID:", paymentId);

            if (!orderId || !paymentId) {
                console.log("Missing required fields");
                return res.status(400).json({
                    success: false,
                    error: "Order ID and Payment ID are required"
                });
            }

            // Find the temporary order
            const tempOrder = await OrderModel.findOne({ orderId });
            console.log("Temporary order found:", tempOrder ? "Yes" : "No");
            
            if (!tempOrder) {
                return res.status(404).json({
                    success: false,
                    error: "Order not found"
                });
            }

            // Verify payment with Razorpay
            try {
                console.log("Verifying payment with Razorpay...");
                const payment = await razorpay.payments.fetch(paymentId);
                console.log("Payment verification response:", payment);
                
                if (!payment) {
                    return res.status(400).json({
                        success: false,
                        error: "Payment not found"
                    });
                }

                if (payment.status !== 'captured') {
                    return res.status(400).json({
                        success: false,
                        error: `Payment not captured. Current status: ${payment.status}`
                    });
                }

                // Verify payment amount matches order amount
                const orderAmount = tempOrder.totalAmount || tempOrder.amount || 0;
                const paymentAmount = payment.amount / 100; // Convert from paise to rupees
                console.log("Order amount:", orderAmount, "Payment amount:", paymentAmount);

                // If order amount is 0, try to calculate it from services
                let finalOrderAmount = orderAmount;
                if (orderAmount === 0 && tempOrder.services && Array.isArray(tempOrder.services)) {
                    finalOrderAmount = tempOrder.services.reduce((total, service) => {
                        return total + (service.price || 0);
                    }, 0);
                    console.log("Calculated order amount from services:", finalOrderAmount);
                }

                if (Math.abs(finalOrderAmount - paymentAmount) > 1) { // Allow small rounding differences
                    console.log("Payment verification failed:", {
                        orderAmount,
                        finalOrderAmount,
                        paymentAmount,
                        tempOrder: tempOrder.toObject()
                    });
                    return res.status(400).json({
                        success: false,
                        error: `Payment amount mismatch. Order amount: ${finalOrderAmount}, Payment amount: ${paymentAmount}`
                    });
                }

                // Create actual order
                try {
                    // Find available employees for this service
                    const serviceDetails = await ServiceModel.findById(tempOrder.serId);
                    if (!serviceDetails) {
                        return res.status(400).json({
                            success: false,
                            error: "Service not found"
                        });
                    }

                    // Get all employees who can perform this service
                    const empIdList = await EmpSerModel.distinct("empId", { "serList.serId": tempOrder.serId });
                    if (!empIdList.length) {
                        return res.status(400).json({
                            success: false,
                            error: "No employees available for this service"
                        });
                    }

                    // Get available employees (not busy)
                    const availableEmployees = await EmployeeModel.find({
                        _id: { $in: empIdList },
                        isBusy: false
                    });

                    if (!availableEmployees.length) {
                        return res.status(400).json({
                            success: false,
                            error: "No employees currently available"
                        });
                    }

                    // Randomly select an available employee
                    const randomIndex = Math.floor(Math.random() * availableEmployees.length);
                    const selectedEmployee = availableEmployees[randomIndex];

                    // Calculate service end time
                    const startTime = moment(tempOrder.service_startTime, "HH:mm");
                    const endTime = moment(startTime).add(serviceDetails.time, 'minutes');

                    const order = new OrderModel({
                        orderId: `${tempOrder.orderId}`,
                        custId: tempOrder.custId,
                        serId: tempOrder.serId,
                        empId: selectedEmployee._id, // Use the randomly selected employee
                        date: tempOrder.service_date,
                        time: tempOrder.service_startTime,
                        address: tempOrder.address,
                        lat: tempOrder.lat,
                        lng: tempOrder.lng,
                        totalAmount: paymentAmount,
                        amount: paymentAmount,
                        payment_method: 'Razorpay',
                        status: 'confirmed',
                        paymentId: paymentId,
                        isActive: true,
                        booking_datetime: moment().format('YYYY-MM-DD HH:mm:ss'),
                        service_startTime: tempOrder.service_startTime,
                        service_endTime: endTime.format('HH:mm:ss'),
                        service_date: tempOrder.service_date
                    });

                    const savedOrder = await order.save();

                    // Update selected employee's status to busy and add order to their dashboard
                    await EmployeeModel.findByIdAndUpdate(selectedEmployee._id, { 
                        isBusy: true,
                        $push: {
                            currentOrders: {
                                orderId: savedOrder._id,
                                serviceId: tempOrder.serId,
                                customerId: tempOrder.custId,
                                date: tempOrder.service_date,
                                time: tempOrder.service_startTime,
                                status: 'assigned'
                            }
                        }
                    });

                    // Delete the temporary order
                    await OrderModel.deleteOne({ orderId: tempOrder.orderId });

                    return res.json({
                        success: true,
                        order: savedOrder._id,
                        employee: {
                            id: selectedEmployee._id,
                            name: `${selectedEmployee.fname} ${selectedEmployee.lname}`
                        },
                        message: "Payment successful and order created with employee assigned"
                    });
        } catch (error) {
                    console.error("Order creation error:", error);
                    return res.status(500).json({
                        success: false,
                        error: "Failed to create order: " + error.message
                    });
                }
            } catch (error) {
                console.error("Payment verification error:", error);
                return res.status(500).json({
                    success: false,
                    error: "Failed to verify payment: " + error.message
                });
            }
        } catch (error) {
            console.error("Order success error:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to process order: " + error.message
            });
        }
    },
    getHistoryByEmpId: async (req, res) => {
        try {
            const empId = req.body.empId;
            // const date = moment().format('YYYY-MM-DD');
            // console.log(date)
            const history = await OrderModel.aggregate(
                [
                    { $match: { empId: new mongoose.Types.ObjectId(empId), status: "completed" } },
                    { $sort: { service_date: -1 } },

                    {
                        $lookup: {
                            from: "services",
                            localField: "serId",
                            foreignField: "_id",
                            as: "serviceDetails",
                        },
                    },
                    {
                        $lookup: {
                            from: "customers",
                            localField: "custId",
                            foreignField: "_id",
                            as: "customerDetails",
                        },
                    },
                    {
                        $project: {
                            _id: 1,
                            orderId: 1,
                            serId: 1,
                            empId: 1,
                            custId: 1,
                            status: 1,
                            amount: 1,
                            service_startTime: 1,
                            service_endTime: 1,
                            service_date: 1,
                            payment_mode: 1,
                            booking_datetime: 1,
                            "serviceDetails.name": 1,
                            "serviceDetails.price": 1,
                            "serviceDetails.avgRating": 1,
                            "serviceDetails.url": 1,
                            "serviceDetails.url": 1,
                            "customerDetails.fname": 1,
                            "customerDetails.lname": 1,
                            "customerDetails.contact_no": 1,
                            "customerDetails.address": 1,

                        }
                    }

                ],
            )
            // console.log(history)
            res.json({ "history": history });
        }
        catch (err) {
            console.log(err)
            res.send(
                err
            );
        }
    },
    paymentDeclined: async (req, res) => {
        const orderId = req.body.orderId;
        try {
            // Update temporary order status
            await OrderModel.findByIdAndUpdate(orderId, { 
                status: "cancelled",
                isActive: false 
            });
            res.json({ message: true });
        } catch (error) {
            console.error(error);
            res.status(500).send(error);
        }
    }, 
    cancelOrder: async (req, res) => {
        try {
            const { orderId } = req.body;
            
            // Find the order
            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({
                    success: false,
                    error: "Order not found"
                });
            }

            // Check if order can be cancelled (only assigned or confirmed orders can be cancelled)
            if (order.status !== 'assigned' && order.status !== 'confirmed') {
                return res.status(400).json({
                    success: false,
                    error: "Order cannot be cancelled in its current state"
                });
            }

            // Update order status
            order.status = 'cancelled';
            order.isActive = false;
            await order.save();

            // Update employee status and remove order from their dashboard
            if (order.empId) {
                await EmployeeModel.findByIdAndUpdate(order.empId, {
                    isBusy: false,
                    $pull: {
                        currentOrders: { orderId: order._id }
                    }
                });
            }

            // If payment was made, initiate refund
            if (order.paymentId) {
                try {
                    const refund = await razorpay.payments.refund(order.paymentId, {
                        amount: order.totalAmount * 100 // Convert to paise
                    });
                    console.log("Refund initiated:", refund);
        } catch (error) {
                    console.error("Refund failed:", error);
                    // Continue with cancellation even if refund fails
                }
            }

            return res.json({
                success: true,
                message: "Order cancelled successfully"
            });
        } catch (error) {
            console.error("Order cancellation error:", error);
            return res.status(500).json({
                success: false,
                error: "Failed to cancel order"
            });
        }
    },
    updateOrder: async (req, res) => {

        const id = req.body.id;
        const { empId, serList, service_datetime, address, payment_mode, status, isActive } = req.body;

        try {
            const order = await OrderModel.findByIdAndUpdate(id, { empId, serList, service_datetime, address, payment_mode, status, isActive }, { new: true });
            res.send(order);
        } catch (error) {
            console.error(error);
            res.status(500).send(error);
        }
    },

    sendOTP: async (req, res) => {

        const id = req.body.orderId;
        const otp = Math.round(Math.random() * (987654 - 123456) + 123456);
        console.log(otp)
        try {
            // const orderOLD = await OrderModel.find({"orderId" : id},{_id:true});
            // console.log(orderOLD);
            const order = await OrderModel.findById(id);
            if (order.otp != null) {
                const oldOTPs = order.otp;
                oldOTPs.push(otp);
                order.otp = oldOTPs
            } else {
                const otparr = [otp];
                order.otp = otparr;
            }
            const addOnList = order.addOns
            let total = 0;
            for (const item of addOnList) {
                const addOnData = await AddOnModel.aggregate([
                    { $unwind: "$addOnList" },
                    {
                        $match: {
                            "addOnList._id": new mongoose.Types.ObjectId(item.item)
                        }
                    },
                    { $project: { addOnList: 1 } }

                ])
                total += parseInt(addOnData[0].addOnList.price);
            }
            total += order.amount;
            const newOrder = await OrderModel.findByIdAndUpdate(id, order)
                .then(async () => {
                    const data = {}
                    const newOrder = await OrderModel.findById(id, { serId: true, custId: true, service_startTime: true });
                    const service = await ServiceModel.findById(newOrder.serId, { price: true, name: true });
                    const customer = await CustomerModel.findById(newOrder.custId, { email: true });
                    const responseAck = emailSender.sendOrderCompletionOTP(customer.email ?? "sgrana447@gmail.com", {
                        "name": service.name,
                        "price": total,
                        "startTime": newOrder.service_startTime,
                        "otp": otp
                    }).then(async () => {
                        // console.log(responseAck);
                    });
                }).then(() => {
                    res.json({ message: true });
                }).catch((error) => {
                    console.log(error)
                    res.json({ message: false, code: 1 });
                });
        } catch (error) {
            console.error(error);
            res.status(500).send(error);
        }
    },
    addAddons: async (req, res) => {
        // console.log(req.body)
        try {
            const orderId = req.body.orderId;
            const addOnId = { item: req.body.addOnId };
            const order = await OrderModel.findById(orderId);
            const addOns = order.addOns;
            // console.log(addOn)
            if (addOns === '' || addOns === null) {
                addOns.push(addOnId);
            } else {
                addOns.push(addOnId);
            }
            order.addOns = addOns;


            const newOrder = await OrderModel.findByIdAndUpdate(orderId, order);

            res.send(newOrder)

        } catch (err) {
            console.log(err);
            res.json(err)
        }
    },
   
    getAddOns: async (req, res) => {
        try {
            const orderId = req.body.orderId;
            const order = await OrderModel.findById(orderId);
            const serId = order.serId;
            const addOnList = order.addOns
            // console.log(addOnList)
            let addOnRes = []
            let total = 0;
            for (const item of addOnList) {
                const addOnData = await AddOnModel.aggregate([
                    { $unwind: "$addOnList" },
                    {
                        $match: {
                            "addOnList._id": new mongoose.Types.ObjectId(item.item)
                        }
                    },
                    { $project: { addOnList: 1 } }

                ])

                addOnRes.push(addOnData[0])
                total += parseInt(addOnData[0].addOnList.price);
            }

            // addOnRes.total = total;
            // console.log(addOnRes)
            res.json({ addOnList: addOnRes, subtotal: total })
        } catch (err) {
            console.log(err);
            res.json(err)
        }
    },
    removeAddOns: async (req, res) => {
        try {
            const orderId = req.body.orderId;
            const addOnId = { item: req.body.addOnId };
            const order = await OrderModel.findById(orderId);
            const serId = order.serId;
            // const addOn = await AddOnModel.find({"addOnList._id":addOnId})

            const addOns = order.addOns;
            for (let i = 0; i < addOns.length; i++) {
                if (addOns[i].item.toString() === addOnId.item) {
                    addOns.splice(i, 1);
                    break; // Exit the loop after removing one item.
                }
            }
            order.addOns = addOns;
            const newOrder = await OrderModel.findByIdAndUpdate(orderId, order);
            res.send(newOrder)
            // res.json("ok")

        } catch (err) {
            console.log(err);
            res.json(err)
        }
    },
    completeOrder: async (req, res) => {
        const id = req.body.orderId;
        const otp = req.body.otp;
        try {
            const order = await OrderModel.findOne({ _id: id, otp: { $in: otp } })
            const addOnList = order.addOns
            let total = 0;
            for (const item of addOnList) {
                const addOnData = await AddOnModel.aggregate([
                    { $unwind: "$addOnList" },
                    {
                        $match: {
                            "addOnList._id": new mongoose.Types.ObjectId(item.item)
                        }
                    },
                    { $project: { addOnList: 1 } }

                ])
                total += parseInt(addOnData[0].addOnList.price);
            }
            total += order.amount;
            if (order != null) {
                order.status = "completed";
                const empId = order.empId;
                const emp = await EmployeeModel.findByIdAndUpdate(empId, { isBusy: false });
                order.amount += total;
                await OrderModel.findByIdAndUpdate(id, order);
                res.json({ message: true })
            } else {
                res.json({ message: false, code: 1 }) // code 1 : incorrect OTP
            }
            //    console.log(order)
        } catch (error) {
            console.error(error);
            res.status(500).send(error);
        }
    },
    deleteOrder: async (req, res) => {
        try {
            const orderId = req.body.orderId || req.body.id;
            if (!orderId) {
                return res.status(400).json({ 
                    message: false, 
                    error: "Order ID is required" 
                });
            }

            const order = await OrderModel.findById(orderId);
            if (!order) {
                return res.status(404).json({ 
                    message: false, 
                    error: "Order not found" 
                });
            }

            // Check if order can be deleted (only pending or cancelled orders can be deleted)
            if (order.status !== "pending" && order.status !== "cancelled") {
                return res.status(400).json({ 
                    message: false, 
                    error: "Only pending or cancelled orders can be deleted" 
                });
            }

            await OrderModel.findByIdAndDelete(orderId);
            res.json({ 
                message: true,
                success: "Order deleted successfully" 
            });
        } catch (error) {
            console.error("Error deleting order:", error);
            res.status(500).json({ 
                message: false, 
                error: "Failed to delete order" 
            });
        }
    },
    getactiveService: async (req, res) => {
        try {
            // Perform aggregation to get service details
            const details = await OrderModel.aggregate([
                {
                    $match: { status: 'working' } // Add any additional match conditions if needed
                },
                {
                    $lookup: {
                        from: "services",
                        localField: "serId",
                        foreignField: "_id",
                        as: "serviceDetails",
                    },
                },
                {
                    $lookup: {
                        from: "customers",
                        localField: "custId",
                        foreignField: "_id",
                        as: "customerDetails",
                    },
                },
                {
                    $lookup: {
                        from: "employees",
                        localField: "empId",
                        foreignField: "_id",
                        as: "employeeDetails",
                    },
                },
            ]);


            res.json(details);
        } catch (err) {
            res.json({
                message: err
            });
        }
    },
    activeService: async (req, res) => {
        const orderId = req.body.orderId;
        try {
            const order = await OrderModel.findById(orderId);

            const empId = order.empId;

            const emp = await EmployeeModel.findById(empId);
            if (emp.isBusy == null || emp.isBusy === false) {
                await EmployeeModel.findByIdAndUpdate(empId, { isBusy: true }, { new: true })
                order.status = "working";
                const newOrder = await OrderModel.findByIdAndUpdate(orderId, order);
                // console.log(newOrder)
                res.json(newOrder)
            } else {
                res.json({ "message": false, code: 1 })
            }
        } catch (err) {
            console.error(err);
            res.status(500).json({ message: 'An error occurred while activating the order' });
        }

    },

    // Similar functions for updating and deleting empSer...
};
