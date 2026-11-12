import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum, IsInt, IsNotEmpty, IsObject, IsString, Matches, Max, MaxLength, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { IngredientUnit } from '@prisma/client';
import { STOCK_LIMIT } from './stock-quantity';

export class IngredientDto {
  @Matches(/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/)
  @MaxLength(50)
  code!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;

  @IsEnum(IngredientUnit)
  unit!: IngredientUnit;
}

export class ReceiptDto {
  @IsInt()
  @Min(1)
  @Max(STOCK_LIMIT)
  quantity!: number;
}

class RecipeLineDto extends ReceiptDto {
  @IsString()
  @IsNotEmpty()
  ingredientId!: string;
}

export class RecipeDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsObject({ each: true })
  @ValidateNested({ each: true })
  @Type(() => RecipeLineDto)
  @ArrayUnique((line: RecipeLineDto | null) => line?.ingredientId)
  ingredients!: RecipeLineDto[];
}
