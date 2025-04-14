// Example customerController.js

const Customer = require('../models/CustomerModel');
var nodemailer = require('nodemailer');
const ServiceModel = require('../models/ServiceModel');
const CustomerModel = require('../models/CustomerModel');
module.exports = {
  getAllCustomers: async (req, res) => {
    // console.log("Hello");
    try {
      const customer = await Customer.find({});
      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },

  validateCustomer : async (req,res)=>{
    const email = req.body.email;
    const password = req.body.password
    const customer = await Customer.findOne({"email": email},{password:true});
    // console.log(customer)
    if(customer != '' && customer != null){
    if(customer.password == password){
      console.log("success")
      res.json({message:true});
    }else{
      res.json({message:false});
    }
  }
    else{
      res.json({message:false});
    }
  },
  createCustomer: async (req, res) => {
    try {
      // console.log(req);
    const customer = new Customer({
        fname : req.body.fname,
        lname : req.body.lname,
        email : req.body.email,
        password : req.body.password,
        contact_no : req.body.contact_no,
        address : req.body.address
    });
      const newCustomer = await customer.save();
      res.status(201).json(newCustomer);
    } catch (error) {
      res.status(400).json(error);
    }
  },
  sendOTP : async (req,res)=>{
    const transporter = nodemailer.createTransport({
      port: 465,               // true for 465, false for other ports
      host: "smtp.gmail.com",
         auth: {
              user: 'bookmyservices.one@gmail.com',
              pass: 'dpxtivjexdkxucvq',
           },
      secure: true,
      });

      const mailData = {
        from: 'bookmyservice@noreply.com',  // sender address
          to: 'tirthprajapati26@gmail.com',   // list of receivers
          subject: 'OTP for account authentication',
          text: 'OTP for account authentication don\' share',
          html: '<p>dont Share : </p><p style ="color:red;"><b> 123456<b> </p>',
        };

        transporter.sendMail(mailData, function (err, info) {
          if(err)
            console.log(err)
          else
            console.log(info);
       });
       res.send("ok");
  },
  getCustomerById: async (req, res) => {
    const custId = req.body._id;

    try {
      const customer = await Customer.findById(custId);
      console.log(customer)
      res.status(200).json(customer);
    } catch (error) {
      res.status(500).json({ error: 'Server error' });
    }
  },
  getCustomerbyemail: async (req, res) => {
    // const custId = req.body.email;
    // console.log(req.body.email)
    try {
      const customer = await Customer.findOne({email:req.body.email});
     if(customer){
      console.log("true");
    
     res.status(200).json({message : true})
    }
    else{
      console.log("false")
      res.status(200).json({message : false});
    }
     
    } catch (error) {
      console.log(error)
      res.status(500).json({ mess: false });
    }
  },
  updateCustomer: async(req,res)=>{
    const custId  = req.body._id;
    const update  = req.body;
    // console.log(custId)
    // console.log(req.body)
    try {
        const customer = await Customer.findByIdAndUpdate(custId,update, { new: true });
      
        res.send(customer);
        
    }catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Server error' });
    }
  },
  deleteCustomer : async (req, res) => {
    const custId  = req.body._id;
    // const status = req.body.status
    try {
        const customer = await Customer.findByIdAndUpdate(custId,{ status: 'inactive' },{new:true});
        
        
        res.send(customer);
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
  },
  activeCustomer : async (req, res) => {
    const custId  = req.body._id;
    // const status = req.body.status
    // console.log(req.body); 
    try {
        const customer = await Customer.findByIdAndUpdate(custId,{ status: 'active' },{new:true});
        
        
        res.send(customer);
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
  },
  getActiveCustomer : async (req, res) => {
    // const custId  = req.body._id;
    // const status = req.body.status
    // console.log(req.body); 
    try {
        const customer = await Customer.find({status:'active'});
        
        
        res.send(customer);
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
  },
  getInActiveCustomer : async (req, res) => {
    // const custId  = req.body._id;
    // const status = req.body.status
    // console.log(req.body); 
    try {
        const customer = await Customer.find({status:'inactive'});
        
        
        res.send(customer);
    }catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Server error' });
    }
  },
  // addService: async(req,res)=>{
  //   try {
  //     const customerId = req.body._id;
  //     const services =req.body.serId;
  //     // const serId=req.body.service_id;
  
  //     // Fetch the customer by their ID
  //     const customer = await Customer.findById(customerId);
  
  //     if (!customer) {
  //       return res.status(404).json({ message: 'Customer not found' });
  //     }
  

  //     // const services = await ServiceModel.find({ name: { $in: serviceIds } });
  
  //     // if (!services || services.length === 0) {
  //     //   return res.status(404).json({ message: 'No services found' });
  //     // }
  
  
  //     customer.services.push(...services);
  //     await customer.save();
  
  //     res.status(200).json({ message: 'Services booked successfully' });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ message: 'Internal server error' });
  //   }
  
  // },
  addItem : async (req, res) =>{
    const custId = req.body.custId;
    const serId = req.body.serId;
    const time = req.body.time;
    const date = req.body.date;
    const serRecord = {
      "serId":serId,
      "time": time,
      "date":date
    };
    try{
      const customer = await Customer.findById(custId);
      if(customer.cart.serList == [] || customer.cart.serList == "" || customer.cart.serList == null){
        customer.cart.serList = serRecord;
      }else{
        const serList = customer.cart.serList;
        serList.push(serRecord);
        customer.cart.serList = serList;
      }
      // console.log(customer);
      const newCustomer = await Customer.findByIdAndUpdate(custId,customer);
      // console.log(newCustomer);
      res.send("ok");
    } catch (error) {
      res.status(500).json(error);
    }
  },
  removeItem: async (req, res) => {
    const custId = req.body.custId;
    const serId = req.body.serId;
    const time = req.body.time;
    const date = req.body.date;

    try {
      const customer = await Customer.findById(custId);
      
      if (!customer) {
        return res.status(404).json({ message: false, error: 'Customer not found' });
      }

      if (!customer.cart || !customer.cart.serList) {
        return res.status(400).json({ message: false, error: 'Cart is empty' });
      }

      // Find and remove the item from cart
      const updatedSerList = customer.cart.serList.filter(item => 
        !(item.serId.toString() === serId && 
          item.time === time && 
          item.date === date)
      );

      // Update the customer's cart
      customer.cart.serList = updatedSerList;
      await customer.save();

      res.status(200).json({ 
        message: true, 
        cart: customer.cart.serList 
      });
    } catch (error) {
      console.error('Error removing item from cart:', error);
      res.status(500).json({ 
        message: false, 
        error: 'Failed to remove item from cart' 
      });
    }
  },
  cart : async (req, res) =>{
    // console.log(req.body)
    const custId = req.body.custId;
    try{
      const customer = await Customer.findById(custId);
      if(customer.cart.serList == [] || customer.cart.serList ==  null ){
        res.send({message:false});
        // customer.cart.serList.push(serRecord)
      }else{
        res.send(customer);
      }
      // console.log(customer);
      
    } catch (error) {
      res.status(500).json(error);
    }
  },
  removeCart : async (req, res) =>{
    const custId = req.body.custId;
    try{
      const customer = await Customer.findById(custId);
        customer.cart.serList = null;
      
      // console.log(customer);
      const newCustomer = await Customer.findByIdAndUpdate(custId,customer);
      console.log(newCustomer);
      res.send("ok");
    } catch (error) {
      res.status(500).json(error);
    }
  },



  removeService : async(req,res)=>{
     try {
       const customerId = req.body._id;
       const  serviceIds  = req.body.serId;

       const customer = await Customer.findById(customerId);
  
       if (!customer) {
         return res.status(404).json({ message: 'Customer not found' });
       }
  
     
       customer.services = customer.services.filter(
         (service) => !serviceIds.includes(service.toString())
     );
  

       await customer.save();
  
       return res.json({ message: 'Services removed successfully', customer });
     } catch (error) {
       console.error(error);
       return res.status(500).json({ message: 'Internal server error' });
     }
   },

  getCart: async (req, res) => {
    try {
      const { custId } = req.body;
      
      if (!custId) {
        return res.status(400).json({ message: false, error: 'Customer ID is required' });
      }

      const customer = await Customer.findById(custId).populate('cart.serList.serId');
      
      if (!customer) {
        return res.status(404).json({ message: false, error: 'Customer not found' });
      }

      // Check if cart exists and has items
      if (!customer.cart || !customer.cart.serList || customer.cart.serList.length === 0) {
        return res.status(200).json({ 
          message: true, 
          cart: [] 
        });
      }

      // Transform the cart data to include service details
      const cartItems = customer.cart.serList.map(item => {
        if (!item.serId) {
          return null;
        }
        return {
          serId: item.serId._id,
          date: item.date,
          time: item.time,
          serviceDetails: {
            name: item.serId.name || 'Unknown Service',
            price: item.serId.price || '0',
            url: item.serId.url || 'fallback-image.jpg'
          }
        };
      }).filter(item => item !== null);

      res.status(200).json({ 
        message: true, 
        cart: cartItems 
      });
    } catch (error) {
      console.error('Error fetching cart:', error);
      res.status(500).json({ 
        message: false, 
        error: 'Failed to fetch cart items' 
      });
    }
  },
};
  
  
  // Similar functions for updating and deleting customer...

