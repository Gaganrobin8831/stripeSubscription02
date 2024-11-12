const express = require('express');

const { HandleRegister, HandleLogin } = require('../controller/user.controller');


const userrouter = express.Router(); 



userrouter.route('/regester').post(HandleRegister) 


userrouter.route('/Login').post(HandleLogin); 




module.exports = userrouter;
