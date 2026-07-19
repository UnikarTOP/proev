import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LeadsService } from './leads.service';
import { CreateLeadDto } from './dto/create-lead.dto';

@Controller('leads')
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Post()
  create(@Body() dto: CreateLeadDto) {
    return this.leadsService.create(dto);
  }

  @Get('provider/:providerId')
  findByProvider(@Param('providerId') providerId: string) {
    // TODO: закрыть auth-guard'ом, чтобы партнёр видел только свои лиды
    return this.leadsService.findByProvider(providerId);
  }
}
