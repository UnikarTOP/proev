import { IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class CreateReviewDto {
  @IsIn(['working', 'broken', 'unknown']) statusReport: string;
  @IsString() @IsOptional() comment?: string;
  @IsInt() @Min(1) @Max(5) @IsOptional() rating?: number;
}
