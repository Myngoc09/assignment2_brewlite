import { Controller,Get,Param,NotFoundException } from '@nestjs/common';
import { PrismaService } from './prisma.service';
@Controller('products') export class ProductsController{constructor(private db:PrismaService){}@Get() list(){return this.db.product.findMany({where:{active:true},include:{sizes:true,toppings:true},orderBy:{name:'asc'}})}@Get(':id') async one(@Param('id') id:string){const p=await this.db.product.findFirst({where:{active:true,OR:[{id},{slug:id}]},include:{sizes:true,toppings:true}});if(!p)throw new NotFoundException('Product not found');return p}}
