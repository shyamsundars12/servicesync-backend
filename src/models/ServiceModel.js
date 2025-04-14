const mongoose = require('mongoose')

const ServiceSchema = new mongoose.Schema({
  name :{
     type : String,
     required : true,
  },
  price :{
     type : String,
     required : true,
  },
  time :{
     type : String,
     required : true,
  },
  rating :{
     type : Number,
     default : -1
  }, 
  desc :{
     type : String,
     default : "Not Specified"
  },
  url :{
   type : String,
   default : "https://res.cloudinary.com/dexuvfg93/image/upload/v1694933313/demoService.jpg"
  },
  imageId:{
   type:String,
   default : "1234556"
  },
  isActive :{
     type : Boolean,
     default : true
  },
})



const ServiceModel = mongoose.model('service',ServiceSchema)
module.exports = ServiceModel 