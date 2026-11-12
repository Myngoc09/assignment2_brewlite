import { Body, Controller, Post, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';

class AuthDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly db: PrismaService, private readonly jwt: JwtService) {}

  @Post('register')
  async register(@Body() dto: AuthDto) {
    const name = dto.name?.trim();
    if (!name) {
      throw new BadRequestException('Name required');
    }

    try {
      const user = await this.db.user.create({
        data: {
          email: dto.email.toLowerCase(),
          name,
          passwordHash: await bcrypt.hash(dto.password, 12),
        },
      });
      return this.session(user);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Email already registered');
      }
      throw error;
    }
  }

  @Post('login')
  async login(@Body() dto: AuthDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.session(user);
  }

  private session({ passwordHash, ...user }: User) {
    return {
      accessToken: this.jwt.sign({ sub: user.id, email: user.email, role: user.role }),
      user,
    };
  }
}
