// Error Handling middleware และ utilities
import { NextRequest, NextResponse } from 'next/server';
import winston from 'winston';

// Logger configuration
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'error' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'ensport-alerts' },
  transports: [
    // Write all logs with importance level of `error` or less to `error.log`
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Write all logs to `combined.log`
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

// Add console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

// Error types
export enum ErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR = 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR = 'AUTHORIZATION_ERROR',
  NOT_FOUND_ERROR = 'NOT_FOUND_ERROR',
  RATE_LIMIT_ERROR = 'RATE_LIMIT_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR = 'FILE_UPLOAD_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
}

// Custom error class
export class AppError extends Error {
  public statusCode: number;
  public type: ErrorType;
  public isOperational: boolean;
  public details?: any;

  constructor(
    message: string,
    statusCode: number = 500,
    type: ErrorType = ErrorType.INTERNAL_SERVER_ERROR,
    details?: any
  ) {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
    this.isOperational = true;
    this.details = details;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Predefined error creators
export const createValidationError = (message: string, details?: any) => {
  return new AppError(message, 400, ErrorType.VALIDATION_ERROR, details);
};

export const createAuthenticationError = (message: string = 'Authentication required') => {
  return new AppError(message, 401, ErrorType.AUTHENTICATION_ERROR);
};

export const createAuthorizationError = (message: string = 'Insufficient permissions') => {
  return new AppError(message, 403, ErrorType.AUTHORIZATION_ERROR);
};

export const createNotFoundError = (message: string = 'Resource not found') => {
  return new AppError(message, 404, ErrorType.NOT_FOUND_ERROR);
};

export const createRateLimitError = (message: string = 'Too many requests') => {
  return new AppError(message, 429, ErrorType.RATE_LIMIT_ERROR);
};

export const createDatabaseError = (message: string, details?: any) => {
  return new AppError(message, 500, ErrorType.DATABASE_ERROR, details);
};

export const createFileUploadError = (message: string, details?: any) => {
  return new AppError(message, 400, ErrorType.FILE_UPLOAD_ERROR, details);
};

// Success response helper
export const createSuccessResponse = (
  data: any, 
  message?: string, 
  status: number = 200
) => {
  const response: any = { data };
  
  if (message) {
    response.message = message;
  }
  
  return NextResponse.json(response, { status });
};

// Error response formatter
const formatErrorResponse = (error: AppError, includeStack: boolean = false) => {
  const response: any = {
    error: {
      type: error.type,
      message: error.message,
      statusCode: error.statusCode,
    },
  };

  // เพิ่ม details ถ้ามี
  if (error.details) {
    response.error.details = error.details;
  }

  // เพิ่ม stack trace ใน development mode เท่านั้น
  if (includeStack && process.env.NODE_ENV === 'development') {
    response.error.stack = error.stack;
  }

  return response;
};

// Main error handler middleware
export const errorHandler = (error: any, req?: NextRequest) => {
  let appError: AppError;

  // Convert different error types to AppError
  if (error instanceof AppError) {
    appError = error;
  } else if (error.name === 'ValidationError') {
    // Mongoose/Prisma validation errors
    appError = createValidationError('Validation failed', error.errors);
  } else if (error.name === 'CastError') {
    // Invalid ObjectId
    appError = createValidationError('Invalid ID format');
  } else if (error.code === 11000) {
    // Duplicate key error
    appError = createValidationError('Duplicate entry found');
  } else if (error.name === 'JsonWebTokenError') {
    appError = createAuthenticationError('Invalid token');
  } else if (error.name === 'TokenExpiredError') {
    appError = createAuthenticationError('Token expired');
  } else if (error.name === 'MulterError') {
    // File upload errors
    let message = 'File upload error';
    if (error.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large';
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Too many files or unexpected field';
    }
    appError = createFileUploadError(message, { code: error.code });
  } else {
    // Generic errors
    appError = new AppError(
      process.env.NODE_ENV === 'production' 
        ? 'Internal server error' 
        : error.message || 'Something went wrong',
      500,
      ErrorType.INTERNAL_SERVER_ERROR
    );
  }

  // Log error
  const logData = {
    error: {
      message: appError.message,
      type: appError.type,
      statusCode: appError.statusCode,
      stack: appError.stack,
      details: appError.details,
    },
    request: req ? {
      method: req.method,
      url: req.url,
      headers: Object.fromEntries(req.headers.entries()),
      userAgent: req.headers.get('user-agent'),
      ip: req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip'),
    } : undefined,
    timestamp: new Date().toISOString(),
  };

  // Log based on error severity
  if (appError.statusCode >= 500) {
    logger.error('Server Error', logData);
  } else if (appError.statusCode >= 400) {
    logger.warn('Client Error', logData);
  } else {
    logger.info('Request Info', logData);
  }

  // Return formatted error response
  return NextResponse.json(
    formatErrorResponse(appError, process.env.NODE_ENV === 'development'),
    { status: appError.statusCode }
  );
};

// Async error wrapper for API routes
export const asyncHandler = (fn: Function) => {
  return async (req: NextRequest, ...args: any[]) => {
    try {
      return await fn(req, ...args);
    } catch (error) {
      return errorHandler(error, req);
    }
  };
};

// Global error handler wrapper
export const withErrorHandler = (handler: Function) => {
  return asyncHandler(handler);
};

// 404 handler
export const notFoundHandler = (req: NextRequest) => {
  const error = createNotFoundError(`Route ${req.method} ${req.url} not found`);
  return errorHandler(error, req);
};

// Development error details
export const getErrorDetails = (error: any) => {
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return {
    name: error.name,
    message: error.message,
    stack: error.stack,
    cause: error.cause,
  };
};

// Error reporting (for external services like Sentry)
export const reportError = async (error: AppError, context?: any) => {
  if (process.env.NODE_ENV === 'production' && error.statusCode >= 500) {
    // TODO: Integrate with error reporting service
    // Example: Sentry.captureException(error, { extra: context });
    console.error('Critical error reported:', error.message);
  }
};

export { logger };
