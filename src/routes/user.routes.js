const express = require('express');

const { HandleRegister, HandleLogin, HandleGetDetail, HandleLogout ,HandleCustomerUpgrade} = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const userrouter = express.Router();



userrouter.route('/register').post(HandleRegister)


userrouter.route('/login').post(HandleLogin);
userrouter.route('/logout').post(HandleLogout);

userrouter.route('/userDetailAndSubscriptionHistory').get(checkAuth, HandleGetDetail)

userrouter.route('/customers').get(HandleCustomerUpgrade)


module.exports = userrouter;
