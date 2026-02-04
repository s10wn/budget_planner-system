import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'] as string;

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    const key = await this.prisma.apiKey.findUnique({
      where: { key: apiKey, isActive: true },
      include: { user: true },
    });

    if (!key) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (key.user.isBlocked) {
      throw new UnauthorizedException('User account is blocked');
    }

    // Check rate limit: 100 requests per hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    if (key.lastUsed && key.lastUsed > oneHourAgo && key.requestsCount >= 100) {
      throw new UnauthorizedException('Rate limit exceeded. Maximum 100 requests per hour.');
    }

    // Reset counter if last used was more than 1 hour ago
    const shouldResetCount = !key.lastUsed || key.lastUsed < oneHourAgo;

    await this.prisma.apiKey.update({
      where: { id: key.id },
      data: {
        requestsCount: shouldResetCount ? 1 : { increment: 1 },
        lastUsed: new Date(),
      },
    });

    request.user = key.user;
    return true;
  }
}
