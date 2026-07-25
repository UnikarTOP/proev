import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

class UpdateStatusDto {
  @IsString() status: string;
  @IsOptional() @IsString() note?: string;
}

class UpdateNoteDto {
  @IsOptional() @IsString() partnerNote?: string;
  @IsOptional() @IsString() nextFollowUp?: string;
}

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId') providerId: string) {
    return this.leadsService.findByProvider(providerId);
  }

  @Get('provider/:providerId/funnel')
  getFunnelStats(@Param('providerId') providerId: string) {
    return this.leadsService.getFunnelStats(providerId);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateStatusDto) {
    return this.leadsService.updateStatus(id, dto.status, dto.note);
  }

  @Patch(':id/note')
  updateNote(@Param('id') id: string, @Body() dto: UpdateNoteDto) {
    return this.leadsService.updateNote(id, dto.partnerNote || '', dto.nextFollowUp);
  }
}
