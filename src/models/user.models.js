const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'Full Name is required'],
   unique: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true
  },
  password: {
    type: String,
    required: [true, 'Password is required']
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
