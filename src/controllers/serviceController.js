const ServiceModel = require('../models/ServiceModel');

const moment = require("moment-timezone")
const uploadImage = require("../Helper/imageUploader.js")
module.exports = {
  createService:  async  (req, res) => {
    console.log(req.body);
    const service = new ServiceModel({
        name: req.body.name,
        price: req.body.price,
        time: req.body.time,
        desc: req.body.desc,
    });

    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).send('No files were uploaded.');
    }

    const image = req.files.image;
    const id = moment.utc().unix()
    let ext = image.name;
    ext = ext.substring(ext.indexOf(".") + 1);
    image.name = id + "." + ext;
    folderPath = "Services";
    // console.log(image.name)
    // Move the uploaded file to a specific location (e.g., 'uploads/')
    image.mv('src/assets/uploads/' + image.name, async (err) => {
        if (err) {
            return res.status(500).send(err);
        }
        const result = await uploadImage(id,folderPath,image.name);
        service.url = result.secure_url;
        console.log(result)
        service.imageId = result.public_id;
        const newService = await service.save();
        res.json(newService);
        

    });
},

getService:  async (req, res) => {

    try {
        const service = await ServiceModel.find({});
        res.json(service);
    }
    catch (err) {
        res.json({
            message: err
        });
    }
},

getServiceById:  async (req, res) => {
const serId = req.body.serId;   

console.log(req.body.serId) 
try {
        
        const service = await ServiceModel.findById(serId);
        res.json(service);
    }
    catch (err) {
        console.log(err);
        res.json({
            message: err
        });
    }
},
  updateService:  async (req, res) => {

    const id = req.body._id;
   const update =req.body;

    try {
        const service = await ServiceModel.findByIdAndUpdate(id,update, { new: true });
        res.send(service);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
},
  InactiveService: async (req, res) => {

    const id = req.body._id;
  
    
    try {
        const service = await ServiceModel.findByIdAndUpdate(id,{isActive: false});
        res.send(service);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
},
ActiveService: async (req, res) => {

    const id = req.body._id;
  
    
    
    try {
        const service = await ServiceModel.findByIdAndUpdate(id,{isActive: true});
        res.send(service);
    } catch (error) {
        console.error(error);
        res.status(500).send(error);
    }
},
  // Similar functions for updating and deleting empSer...
};