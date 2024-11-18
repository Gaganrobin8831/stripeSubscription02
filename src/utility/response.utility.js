function  successResponse(res, data, message, statusCode = 200)  {
    return res.status(statusCode).json({
      status: 'success',
      message,
      data,
    });
  };
  
  function  errorResponse(res, data, message, statusCode = 500){
    return res.status(statusCode).json({
      status: 'error',
      message,
      data,
    });
  };


  function validationErrorResponse(res, data, message, statusCode = 400) {
    return res.status(statusCode).json({
        status: 'fail',
        message,
        data,
      });
  }
  
  
  module.exports = {
    successResponse,
    errorResponse,
    validationErrorResponse,
  };
  