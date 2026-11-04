import { Body,Controller,Post,UnauthorizedException,BadRequestException } from '@nestjs/common';
import { IsEmail,IsOptional,IsString,MinLength } from 'class-validator';
import * as bcrypt from 'bcryptjs';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from './prisma.service';
class AuthDto{@IsEmail() email!:string;@IsString() @MinLength(8) password!:string;@IsOptional()@IsString() name?:string}
@Controller('auth') export class AuthController{constructor(private db:PrismaService,private jwt:JwtService){}@Post('register')async register(@Body() d:AuthDto){if(!d.name)throw new BadRequestException('Name required');if(await this.db.user.findUnique({where:{email:d.email.toLowerCase()}}))throw new BadRequestException('Email already registered');return this.session(await this.db.user.create({data:{email:d.email.toLowerCase(),name:d.name,passwordHash:await bcrypt.hash(d.password,12)}}))}@Post('login')async login(@Body() d:AuthDto){const u=await this.db.user.findUnique({where:{email:d.email.toLowerCase()}});if(!u||!(await bcrypt.compare(d.password,u.passwordHash)))throw new UnauthorizedException('Email or password is incorrect');return this.session(u)}private session(u:any){const{passwordHash,...safe}=u;return{accessToken:this.jwt.sign({sub:u.id,email:u.email,role:u.role}),user:safe}}}
