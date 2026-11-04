import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
async function bootstrap(){const app=await NestFactory.create(AppModule);app.setGlobalPrefix('api');app.enableCors({origin:process.env.WEB_ORIGIN?.split(',')??true,credentials:true});app.useGlobalPipes(new ValidationPipe({whitelist:true,transform:true,forbidNonWhitelisted:true}));await app.listen(Number(process.env.PORT||process.env.API_PORT)||3001,'0.0.0.0')}
bootstrap();
