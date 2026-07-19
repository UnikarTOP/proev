import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateLeadDto {
  @IsUUID() providerId: string;
  @IsString() name: string;
  @IsString() phone: string;
  @IsString() @IsOptional() message?: string;
}
