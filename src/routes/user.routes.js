const express = require('express');

const { handleRegister, handleLogin, handleGetDetail, handleLogout ,handleCustomerUpgrade} = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth.middleware');

const userRouter = express.Router();



userRouter.route('/register').post(handleRegister)


userRouter.route('/login').post(handleLogin);
userRouter.route('/logout').post(handleLogout);

userRouter.route('/userDetailAndSubscriptionHistory').get(checkAuth, handleGetDetail)

userRouter.route('/customers').post(checkAuth,handleCustomerUpgrade)


module.exports = userRouter;
