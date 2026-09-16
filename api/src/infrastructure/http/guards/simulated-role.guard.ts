import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const KURI_ROLES = 'kuri_roles';
export const RequireKuriRoles = (...roles: string[]) =>
  SetMetadata(KURI_ROLES, roles);

@Injectable()
export class SimulatedRoleGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<string[]>(KURI_ROLES, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!allowed) return true;
    const role = context
      .switchToHttp()
      .getRequest<{ header(name: string): string | undefined }>()
      .header('X-Kuri-Role');
    return role !== undefined && allowed.includes(role);
  }
}
