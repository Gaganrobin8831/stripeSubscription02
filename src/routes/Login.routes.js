const express = require('express');

const { HandleRegister, HandleLogin, HandleGetDetail } = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth');


const userrouter = express.Router(); 



userrouter.route('/regester').post(HandleRegister) 


userrouter.route('/Login').post(HandleLogin); 

userrouter.route('/showdata').get(checkAuth,HandleGetDetail)


module.exports = userrouter;
