import { ThrottlerModuleOptions } from '@nestjs/throttler';
import { loadEnvironment } from '../../config/environment';

export function throttleOptions(): ThrottlerModuleOptions {
  const environment = loadEnvironment();
  return [
    { ttl: environment.throttleTtlMs, limit: environment.throttleIngestLimit },
  ];
}
