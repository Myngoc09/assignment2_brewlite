import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Role } from '@prisma/client';

interface AuthClaims {
  sub: string;
  role: Role;
}

export interface AuthenticatedRequest {
  user: AuthClaims;
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & {
      headers: { authorization?: string };
    }>();
    const token = request.headers.authorization?.match(/^Bearer +([^\s]+)$/i)?.[1];
    if (!token) {
      throw new UnauthorizedException('Bearer token required');
    }

    try {
      request.user = await this.jwt.verifyAsync<AuthClaims>(token);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
