import ApiError from '../utils/ApiError.js';

export const notFoundHandler = (req, _res, next) => {
  next(ApiError.notFound(`Cannot ${req.method} ${req.originalUrl} - Route not found on AgriSmart API`));
};

export default notFoundHandler;
