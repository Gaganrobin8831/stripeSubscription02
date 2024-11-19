const express = require('express');

const { handleRegister, handleLogin, handleGetDetail, handleLogout ,handleCustomerUpgrade} = require('../controller/user.controller');
const { checkAuth } = require('../middleware/auth.middleware');
const { validateRegistration } = require('../validater/userRegister.validate');
const { validateLogin } = require('../validater/userLogin.validate');

const userRouter = express.Router();



userRouter.route('/register').post(validateRegistration,handleRegister)


userRouter.route('/login').post(validateLogin,handleLogin);
userRouter.route('/logout').post(handleLogout);

userRouter.route('/userDetailAndSubscriptionHistory').get(checkAuth, handleGetDetail)

userRouter.route('/customers').post(checkAuth,handleCustomerUpgrade)


module.exports = userRouter;
