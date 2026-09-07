import { Request, Response, NextFunction } from 'express';

export function errorHandler(
  err: Error & { statusCode?: number; status?: number },
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  // Keep detailed diagnostics strictly server-side
  console.error('[server error]:', {
    name: err.name,
    message: err.message,
    stack: err.stack,
  });

  const statusCode = typeof err.statusCode === 'number'
    ? err.statusCode
    : typeof err.status === 'number'
    ? err.status
    : 500;

  // Never leak internal stack traces, DB connection strings, paths, or provider raw payloads to clients
  res.status(statusCode >= 400 && statusCode < 600 ? statusCode : 500).json({
    error: statusCode >= 500 ? 'Internal Server Error' : 'Request Error',
    message: statusCode >= 500
      ? 'An unexpected error occurred while processing the request.'
      : err.message,
  });
}

