const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  custmorStripeId:{
    type: String
    
  },
  token:{
    type:String
  },
  contactNumber:{
    type:String
  },
  countryCode:{
    type:String
  }
},{timestamps:true});

const User = mongoose.model('User', userSchema);
module.exports = User;
