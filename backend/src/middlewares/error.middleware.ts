import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError.js';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let errorCode = 'INTERNAL_SERVER_ERROR';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    errorCode = err.errorCode || 'ERROR';
  } else if (err.name === 'ValidationError') {
    statusCode = 400;
    message = err.message;
    errorCode = 'DATABASE_VALIDATION_ERROR';
  } else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token.';
    errorCode = 'INVALID_TOKEN';
  } else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired.';
    errorCode = 'TOKEN_EXPIRED';
  }

  console.error('Error Stack:', err);

  return res.status(statusCode).json({
    success: false,
    message,
    errorCode
  });
};
