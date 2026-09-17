import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { OrderDomainError } from '../../../domain/orders/errors/order-domain.error';

type HttpLocals = Record<string, unknown> & { traceId?: string };

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host
      .switchToHttp()
      .getResponse<Response<unknown, HttpLocals>>();
    const traceHeader = response.getHeader('X-Trace-Id');
    const traceId = typeof traceHeader === 'string' ? traceHeader : 'unknown';
    if (exception instanceof OrderDomainError) {
      response.status(exception.statusCode).json({
        code: exception.code,
        message: exception.message,
        details: [],
        trace_id: traceId,
      });
      return;
    }
    if (exception instanceof HttpException) {
      const status: number = exception.getStatus();
      const exceptionResponse: unknown = exception.getResponse();
      const message =
        typeof exceptionResponse === 'string'
          ? exceptionResponse
          : 'Request failed.';
      response.status(status).json({
        code:
          status === 403
            ? 'FORBIDDEN'
            : status === 429
              ? 'RATE_LIMITED'
              : status === 400
                ? 'VALIDATION_ERROR'
                : 'BAD_REQUEST',
        message,
        details: [],
        trace_id: traceId,
      });
      return;
    }
    if (isForeignKeyViolation(exception)) {
      response.status(HttpStatus.UNPROCESSABLE_ENTITY).json({
        code: 'REFERENCE_NOT_FOUND',
        message: 'A referenced restaurant or courier does not exist.',
        details: [],
        trace_id: traceId,
      });
      return;
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      code: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred.',
      details: [],
      trace_id: traceId,
    });
  }
}

function isForeignKeyViolation(exception: unknown): boolean {
  if (!(exception instanceof QueryFailedError)) return false;
  return (exception.driverError as { code?: string }).code === '23503';
}
