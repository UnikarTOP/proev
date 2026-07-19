import { IsString, IsNumber, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateStationDto {
  @IsString() name: string;
  @IsString() @IsOptional() networkOperator?: string;
  @IsNumber() latitude: number;
  @IsNumber() longitude: number;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() city?: string;
  @IsArray() @IsOptional() connectorTypes?: string[]; // ['CCS2','GBT','Type2']
  @IsIn(['slow', 'fast', 'ultra_fast']) @IsOptional() chargingSpeed?: string;
  @IsNumber() @IsOptional() powerKw?: number;
  @IsString() @IsOptional() priceInfo?: string;
}
