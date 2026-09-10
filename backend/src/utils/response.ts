import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
}

export const sendSuccess = <T>(res: Response, data: T, statusCode = 200): Response => {
  const payload: ApiResponse<T> = {
    success: true,
    data,
  };
  return res.status(statusCode).json(payload);
};

export const sendError = (res: Response, message: string, statusCode = 400): Response => {
  const payload: ApiResponse = {
    success: false,
    message,
  };
  return res.status(statusCode).json(payload);
};
