import { Controller, Get, Query } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { PrismaService } from '../prisma/prisma.service';

@Controller('ev-models')
export class EvModelsController {
  constructor(private prisma: PrismaService) {}

  // GET /api/ev-models — все активные модели
  @SkipThrottle()
  @Get()
  async getAll(@Query('brand') brand?: string) {
    return this.prisma.eVModel.findMany({
      where: {
        isActive: true,
        ...(brand ? { brand } : {}),
      },
      orderBy: [{ brand: 'asc' }, { model: 'asc' }, { year: 'asc' }],
      select: {
        id: true, brand: true, model: true, year: true,
        range: true, consumption: true, battery: true,
        connector: true, maxChargeDC: true, maxChargeAC: true,
        origin: true, isHybrid: true, notes: true,
      },
    });
  }

  // GET /api/ev-models/brands — список марок
  @SkipThrottle()
  @Get('brands')
  async getBrands() {
    const brands = await this.prisma.eVModel.findMany({
      where: { isActive: true },
      select: { brand: true },
      distinct: ['brand'],
      orderBy: { brand: 'asc' },
    });
    return brands.map(b => b.brand);
  }
}
