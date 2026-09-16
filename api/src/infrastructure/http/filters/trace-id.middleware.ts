import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export function traceIdMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const traceId = request.header('X-Trace-Id') ?? randomUUID();
  response.locals.traceId = traceId;
  response.setHeader('X-Trace-Id', traceId);
  next();
}
