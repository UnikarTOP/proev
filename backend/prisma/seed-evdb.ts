// Запускается отдельно: ts-node prisma/seed-evdb.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EV_DATA = [
  // Evolute
  { brand: 'Evolute', model: 'i-PRO', year: 2022, range: 433, consumption: 12.6, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Aeolus E70', notes: 'NEDC. Реальный ~250-300 км' },
  { brand: 'Evolute', model: 'i-PRO', year: 2023, range: 433, consumption: 12.6, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Aeolus E70' },
  { brand: 'Evolute', model: 'i-JOY', year: 2022, range: 405, consumption: 15.2, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Fengon 500' },
  { brand: 'Evolute', model: 'i-JOY', year: 2023, range: 405, consumption: 15.2, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Fengon 500' },
  { brand: 'Evolute', model: 'i-JOY (российская батарея)', year: 2024, range: 480, consumption: 14.5, battery: 60, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Fengon 500', notes: 'Батарея SAE +20% к запасу' },
  { brand: 'Evolute', model: 'i-SKY 85.9 кВт·ч', year: 2023, range: 511, consumption: 18.3, battery: 85.9, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder' },
  { brand: 'Evolute', model: 'i-SKY City Edition', year: 2023, range: 400, consumption: 17.5, battery: 64.4, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder', notes: 'LFP, V2L 220В' },
  { brand: 'Evolute', model: 'i-SKY City Edition', year: 2024, range: 400, consumption: 17.5, battery: 64.4, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder' },
  { brand: 'Evolute', model: 'i-SKY (новый кузов)', year: 2026, range: 424, consumption: 16.8, battery: 62, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, notes: '218 л.с., LFP, зарядка 28 мин 30-80%' },
  { brand: 'Evolute', model: 'i-VAN', year: 2023, range: 270, consumption: 27.0, battery: 70.7, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng DFAC Fengon E17', notes: '7 мест' },
  { brand: 'Evolute', model: 'i-SPACE', year: 2024, range: 87, consumption: 22.0, battery: 17.5, connector: 'GBT', maxChargeDC: 0, maxChargeAC: 7, isHybrid: true, notes: 'PHEV: 87 км EV, 1150 км суммарно' },
  // Tesla
  { brand: 'Tesla', model: 'Model 3 Standard Range', year: 2023, range: 491, consumption: 14.9, battery: 60, connector: 'CCS2', maxChargeDC: 170, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model 3 Long Range', year: 2023, range: 629, consumption: 14.3, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model 3 Performance', year: 2023, range: 547, consumption: 15.7, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model Y Standard Range', year: 2023, range: 430, consumption: 16.9, battery: 60, connector: 'CCS2', maxChargeDC: 170, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model Y Long Range', year: 2023, range: 533, consumption: 16.9, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model S Long Range', year: 2023, range: 652, consumption: 17.1, battery: 100, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { brand: 'Tesla', model: 'Model X Long Range', year: 2023, range: 543, consumption: 20.5, battery: 100, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  // BYD
  { brand: 'BYD', model: 'Han EV', year: 2023, range: 506, consumption: 16.6, battery: 85.4, connector: 'GBT', maxChargeDC: 120, maxChargeAC: 11 },
  { brand: 'BYD', model: 'Seal', year: 2023, range: 570, consumption: 15.1, battery: 82.5, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { brand: 'BYD', model: 'Seal U', year: 2024, range: 520, consumption: 17.2, battery: 82.5, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { brand: 'BYD', model: 'Atto 3', year: 2023, range: 480, consumption: 16.5, battery: 60.5, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11 },
  { brand: 'BYD', model: 'Dolphin', year: 2023, range: 427, consumption: 14.8, battery: 60.4, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7 },
  { brand: 'BYD', model: 'Tang EV', year: 2023, range: 500, consumption: 21.8, battery: 108.8, connector: 'GBT', maxChargeDC: 110, maxChargeAC: 11 },
  { brand: 'BYD', model: 'Song Plus EV', year: 2023, range: 505, consumption: 17.5, battery: 71.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  // Zeekr
  { brand: 'Zeekr', model: '001', year: 2023, range: 544, consumption: 19.3, battery: 100, connector: 'GBT', maxChargeDC: 200, maxChargeAC: 11 },
  { brand: 'Zeekr', model: '007', year: 2024, range: 580, consumption: 14.8, battery: 75, connector: 'GBT', maxChargeDC: 500, maxChargeAC: 11 },
  { brand: 'Zeekr', model: 'X', year: 2023, range: 440, consumption: 16.2, battery: 66, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { brand: 'Zeekr', model: '009', year: 2023, range: 700, consumption: 26.0, battery: 140, connector: 'GBT', maxChargeDC: 500, maxChargeAC: 11 },
  // Li Auto
  { brand: 'Li Auto', model: 'L9', year: 2023, range: 215, consumption: 23.5, battery: 44.5, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true, notes: 'EREV 1315 км суммарно' },
  { brand: 'Li Auto', model: 'L8', year: 2023, range: 215, consumption: 22.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { brand: 'Li Auto', model: 'L7', year: 2023, range: 212, consumption: 21.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { brand: 'Li Auto', model: 'MEGA', year: 2024, range: 710, consumption: 23.5, battery: 149, connector: 'GBT', maxChargeDC: 520, maxChargeAC: 11 },
  { brand: 'Li Auto', model: 'L6', year: 2024, range: 215, consumption: 20.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  // Aito
  { brand: 'Aito', model: 'M9 EV', year: 2024, range: 630, consumption: 21.0, battery: 100, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  { brand: 'Aito', model: 'M5 EV', year: 2023, range: 530, consumption: 18.5, battery: 80, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  // Voyah
  { brand: 'Voyah', model: 'Free EV', year: 2023, range: 500, consumption: 22.0, battery: 88.1, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  { brand: 'Voyah', model: 'Dream', year: 2023, range: 430, consumption: 29.5, battery: 116, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  // Nio
  { brand: 'Nio', model: 'ET5', year: 2023, range: 560, consumption: 15.3, battery: 75, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { brand: 'Nio', model: 'ET7', year: 2023, range: 580, consumption: 19.0, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { brand: 'Nio', model: 'EL6', year: 2023, range: 579, consumption: 19.2, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { brand: 'Nio', model: 'ES8', year: 2023, range: 580, consumption: 23.0, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  // Xpeng
  { brand: 'Xpeng', model: 'P7', year: 2023, range: 562, consumption: 15.2, battery: 80.9, connector: 'GBT', maxChargeDC: 120, maxChargeAC: 11 },
  { brand: 'Xpeng', model: 'G9', year: 2023, range: 520, consumption: 19.0, battery: 98, connector: 'GBT', maxChargeDC: 300, maxChargeAC: 11 },
  { brand: 'Xpeng', model: 'G6', year: 2023, range: 551, consumption: 15.8, battery: 87.5, connector: 'GBT', maxChargeDC: 270, maxChargeAC: 11 },
  // Volkswagen
  { brand: 'Volkswagen', model: 'ID.3', year: 2023, range: 426, consumption: 15.4, battery: 58, connector: 'CCS2', maxChargeDC: 100, maxChargeAC: 11 },
  { brand: 'Volkswagen', model: 'ID.4', year: 2023, range: 520, consumption: 17.9, battery: 77, connector: 'CCS2', maxChargeDC: 135, maxChargeAC: 11 },
  { brand: 'Volkswagen', model: 'ID.6', year: 2023, range: 490, consumption: 20.5, battery: 77, connector: 'CCS2', maxChargeDC: 135, maxChargeAC: 11 },
  // BMW
  { brand: 'BMW', model: 'iX xDrive40', year: 2023, range: 425, consumption: 20.1, battery: 76.6, connector: 'CCS2', maxChargeDC: 150, maxChargeAC: 11 },
  { brand: 'BMW', model: 'iX xDrive50', year: 2023, range: 630, consumption: 20.6, battery: 111.5, connector: 'CCS2', maxChargeDC: 200, maxChargeAC: 11 },
  { brand: 'BMW', model: 'i4 eDrive40', year: 2023, range: 590, consumption: 18.1, battery: 83.9, connector: 'CCS2', maxChargeDC: 200, maxChargeAC: 11 },
  // Hyundai / Kia
  { brand: 'Hyundai', model: 'IONIQ 5 72.6 кВт·ч', year: 2023, range: 481, consumption: 17.0, battery: 72.6, connector: 'CCS2', maxChargeDC: 220, maxChargeAC: 11 },
  { brand: 'Hyundai', model: 'IONIQ 6 Long Range', year: 2023, range: 614, consumption: 14.3, battery: 77.4, connector: 'CCS2', maxChargeDC: 230, maxChargeAC: 11 },
  { brand: 'Kia', model: 'EV6 Long Range', year: 2023, range: 528, consumption: 16.5, battery: 77.4, connector: 'CCS2', maxChargeDC: 233, maxChargeAC: 11 },
  { brand: 'Kia', model: 'EV9', year: 2024, range: 541, consumption: 22.1, battery: 99.8, connector: 'CCS2', maxChargeDC: 233, maxChargeAC: 11 },
  // Nissan
  { brand: 'Nissan', model: 'Leaf 40 кВт·ч', year: 2023, range: 270, consumption: 16.5, battery: 40, connector: 'CHAdeMO', maxChargeDC: 50, maxChargeAC: 7 },
  { brand: 'Nissan', model: 'Leaf 62 кВт·ч', year: 2023, range: 385, consumption: 17.0, battery: 62, connector: 'CHAdeMO', maxChargeDC: 100, maxChargeAC: 7 },
  // Dongfeng
  { brand: 'Dongfeng', model: 'Aeolus E70', year: 2022, range: 501, consumption: 15.8, battery: 70.2, connector: 'GBT', maxChargeDC: 80, origin: 'Оригинал Evolute i-PRO' },
  { brand: 'Dongfeng', model: 'Forthing Thunder', year: 2023, range: 530, consumption: 17.2, battery: 85.9, connector: 'GBT', maxChargeDC: 100, origin: 'Оригинал Evolute i-SKY' },
  { brand: 'Dongfeng', model: 'Fengon 500 EV', year: 2022, range: 400, consumption: 16.0, battery: 53, connector: 'GBT', maxChargeDC: 60, origin: 'Оригинал Evolute i-JOY' },
  { brand: 'Dongfeng', model: 'Nammi 01', year: 2023, range: 401, consumption: 12.9, battery: 42.3, connector: 'GBT', maxChargeDC: 60 },
  // BAIC
  { brand: 'BAIC', model: 'EU5 R600', year: 2022, range: 416, consumption: 15.9, battery: 61.8, connector: 'GBT', maxChargeDC: 60 },
  { brand: 'BAIC', model: 'EX360', year: 2021, range: 360, consumption: 16.1, battery: 52.8, connector: 'GBT', maxChargeDC: 60 },
  // GAC Aion
  { brand: 'GAC Aion', model: 'Aion V Plus', year: 2023, range: 602, consumption: 16.7, battery: 80, connector: 'GBT', maxChargeDC: 250 },
  { brand: 'GAC Aion', model: 'Aion S Plus', year: 2023, range: 602, consumption: 13.9, battery: 70.8, connector: 'GBT', maxChargeDC: 80 },
  { brand: 'GAC Aion', model: 'Aion Y', year: 2023, range: 510, consumption: 14.8, battery: 65, connector: 'GBT', maxChargeDC: 80 },
];

async function main() {
  console.log('Загружаем базу электромобилей...');
  let added = 0;
  for (const ev of EV_DATA) {
    const existing = await prisma.eVModel.findFirst({
      where: { brand: ev.brand, model: ev.model, year: ev.year }
    });
    if (!existing) {
      await prisma.eVModel.create({ data: ev });
      added++;
    }
  }
  console.log(`Готово: добавлено ${added} из ${EV_DATA.length} моделей`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
