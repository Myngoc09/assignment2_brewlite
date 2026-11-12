import { Body, Controller, ForbiddenException, Get, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { AuthGuard, AuthenticatedRequest } from './auth.guard';
import { IngredientDto, ReceiptDto, RecipeDto } from './inventory.dto';
import { InventoryService } from './inventory.service';

@Controller('inventory')
@UseGuards(AuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Get('ingredients')
  list(@Req() request: AuthenticatedRequest) {
    this.requireStaff(request);
    return this.inventory.list();
  }

  @Post('ingredients')
  create(@Req() request: AuthenticatedRequest, @Body() dto: IngredientDto) {
    this.requireStaff(request);
    return this.inventory.create(dto);
  }

  @Post('ingredients/:id/receipts')
  receive(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: ReceiptDto) {
    this.requireStaff(request);
    return this.inventory.receive(id, dto.quantity, request.user.sub);
  }

  @Get('ingredients/:id/movements')
  movements(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.requireStaff(request);
    return this.inventory.movements(id);
  }

  @Get('sizes/:id/recipe')
  getSizeRecipe(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.requireStaff(request);
    return this.inventory.recipe('size', id);
  }

  @Get('toppings/:id/recipe')
  getToppingRecipe(@Req() request: AuthenticatedRequest, @Param('id') id: string) {
    this.requireStaff(request);
    return this.inventory.recipe('topping', id);
  }

  @Put('sizes/:id/recipe')
  sizeRecipe(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RecipeDto) {
    this.requireStaff(request);
    return this.inventory.setRecipe('size', id, dto);
  }

  @Put('toppings/:id/recipe')
  toppingRecipe(@Req() request: AuthenticatedRequest, @Param('id') id: string, @Body() dto: RecipeDto) {
    this.requireStaff(request);
    return this.inventory.setRecipe('topping', id, dto);
  }

  private requireStaff({ user }: AuthenticatedRequest) {
    if (user.role !== 'STAFF' && user.role !== 'MANAGER') {
      throw new ForbiddenException('Staff role required');
    }
  }
}
