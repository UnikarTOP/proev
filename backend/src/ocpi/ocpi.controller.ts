import { Controller, Post, Get, Param, Body, Headers, UnauthorizedException } from '@nestjs/common';
import { OcpiService } from './ocpi.service';
import { PrismaService } from '../prisma/prisma.service';

// ── Наши OCPI эндпоинты (мы как EMSP) ───────────────────────────────────────
// Когда Electro.cars или другой CPO захочет интегрироваться с нами —
// они сделают запросы к этим эндпоинтам

@Controller('ocpi')
export class OcpiController {
  constructor(
    private ocpi: OcpiService,
    private prisma: PrismaService,
  ) {}

  private validateOcpiToken(auth: string) {
    const token = auth?.replace('Token ', '').trim();
    const expected = process.env.OCPI_SERVER_TOKEN;
    if (!expected || token !== expected) {
      throw new UnauthorizedException('Invalid OCPI token');
    }
    return token;
  }

  // ── Версии — обязательный эндпоинт ──────────────────────────────────────

  @Get('versions')
  getVersions(@Headers('authorization') auth: string) {
    this.validateOcpiToken(auth);
    const base = `${process.env.API_URL || 'https://api.proev.ru'}/api/ocpi`;
    return {
      status_code: 1000,
      status_message: 'Success',
      timestamp: new Date().toISOString(),
      data: [
        { version: '2.2.1', url: `${base}/2.2.1/details` },
        { version: '2.2',   url: `${base}/2.2/details`   },
      ],
    };
  }

  @Get(':version/details')
  getVersionDetails(
    @Param('version') version: string,
    @Headers('authorization') auth: string,
  ) {
    this.validateOcpiToken(auth);
    const base = `${process.env.API_URL || 'https://api.proev.ru'}/api/ocpi/${version}`;
    return {
      status_code: 1000,
      status_message: 'Success',
      timestamp: new Date().toISOString(),
      data: {
        version,
        endpoints: [
          { identifier: 'credentials', role: 'EMSP', url: `${base}/credentials` },
          { identifier: 'locations',   role: 'EMSP', url: `${base}/locations`   },
        ],
      },
    };
  }

  // ── Credentials handshake ────────────────────────────────────────────────

  @Post(':version/credentials')
  async registerCredentials(
    @Param('version') version: string,
    @Headers('authorization') auth: string,
    @Body() body: { token: string; url: string; roles: any[] },
  ) {
    this.validateOcpiToken(auth);

    // Сохраняем данные партнёра
    const partnerId = body.roles?.[0]?.party_id || 'unknown';
    await this.prisma.integration.upsert({
      where: { key: `ocpi_partner_${partnerId}` },
      update: {
        value: JSON.stringify({
          versionsUrl: body.url,
          token: body.token,
        }),
        name: `OCPI: ${partnerId}`,
        isEnabled: true,
      },
      create: {
        key: `ocpi_partner_${partnerId}`,
        name: `OCPI: ${partnerId}`,
        value: JSON.stringify({
          versionsUrl: body.url,
          token: body.token,
        }),
        isEnabled: true,
      },
    });

    const base = `${process.env.API_URL || 'https://api.proev.ru'}/api/ocpi/${version}`;

    return {
      status_code: 1000,
      status_message: 'Success',
      timestamp: new Date().toISOString(),
      data: {
        token: process.env.OCPI_SERVER_TOKEN || 'proev-ocpi-token',
        url: `${process.env.API_URL || 'https://api.proev.ru'}/api/ocpi/versions`,
        roles: [
          {
            role: 'EMSP',
            party_id: 'PEV',
            country_code: 'RU',
            business_details: {
              name: 'proev.ru',
              website: 'https://proev.ru',
            },
          },
        ],
      },
    };
  }

  // ── Push локаций от CPO к нам ────────────────────────────────────────────

  @Post(':version/locations/:countryCode/:partyId/:locationId')
  async receiveLocation(
    @Param('version') version: string,
    @Param('countryCode') countryCode: string,
    @Param('partyId') partyId: string,
    @Param('locationId') locationId: string,
    @Headers('authorization') auth: string,
    @Body() location: any,
  ) {
    this.validateOcpiToken(auth);

    // Сохраняем/обновляем локацию
    await this.ocpi.upsertLocations([{ ...location, id: locationId }], `${countryCode}-${partyId}`);

    return {
      status_code: 1000,
      status_message: 'Success',
      timestamp: new Date().toISOString(),
      data: null,
    };
  }

  // ── Административные эндпоинты (внутренние, без OCPI auth) ───────────────

  /** POST /api/ocpi/admin/sync/:partnerId — запустить синхронизацию */
  @Post('admin/sync/:partnerId')
  async syncPartner(@Param('partnerId') partnerId: string) {
    const adminToken = process.env.ADMIN_COOKIE_SECRET;
    // В продакшне добавить проверку токена

    const result = await this.ocpi.sync(partnerId);
    return {
      ok: true,
      partnerId,
      ...result,
      message: `Синхронизировано: ${result.locations} локаций, создано ${result.created}, обновлено ${result.updated}`,
    };
  }

  /** GET /api/ocpi/admin/partners — список настроенных партнёров */
  @Get('admin/partners')
  async listPartners() {
    const integrations = await this.prisma.integration.findMany({
      where: { key: { startsWith: 'ocpi_partner_' } },
      select: { key: true, name: true, isEnabled: true, lastFetchedAt: true, lastError: true },
    });

    return {
      partners: integrations.map(i => ({
        id: i.key.replace('ocpi_partner_', ''),
        name: i.name,
        isEnabled: i.isEnabled,
        lastSync: i.lastFetchedAt,
        lastError: i.lastError,
      })),
    };
  }
}
