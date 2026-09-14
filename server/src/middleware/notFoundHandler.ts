import type { NextFunction, Request, Response } from 'express';
import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req: Request, _res: Response, next: NextFunction) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl} - Route not found on AgriSmart API`));
};

export default notFoundHandler;