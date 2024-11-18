const express = require('express');

const { handleRegister, handleLogin, handleGetDetail, handleLogout ,handleCustomerUpgrade} = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const userrouter = express.Router();



userrouter.route('/register').post(handleRegister)


userrouter.route('/login').post(handleLogin);
userrouter.route('/logout').post(handleLogout);

userrouter.route('/userDetailAndSubscriptionHistory').get(checkAuth, handleGetDetail)

userrouter.route('/customers').get(handleCustomerUpgrade)


module.exports = userrouter;
