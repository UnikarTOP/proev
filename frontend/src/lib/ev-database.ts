/**
 * Единая база электромобилей proev.ru
 * Источники: WLTP/NEDC сертификаты, официальные сайты производителей, drom.ru, auto.mail.ru
 * Расход — паспортный (реальный выше на 10-40% в зависимости от сезона и стиля)
 * Обновлено: июль 2026
 */

export interface EVModel {
  id: string;            // уникальный идентификатор
  brand: string;
  model: string;
  year: number;          // год модели
  range: number;         // запас хода км (WLTP/NEDC)
  consumption: number;   // кВт·ч / 100 км (паспортный)
  battery: number;       // кВт·ч полная ёмкость
  connector: string;     // основной быстрый разъём
  maxChargeDC: number;   // макс. мощность DC зарядки кВт
  maxChargeAC?: number;  // макс. AC кВт
  origin?: string;       // китайский оригинал (для Evolute и др.)
  isHybrid?: boolean;    // PHEV (только электро режим)
  notes?: string;
}

export const EV_DATABASE: EVModel[] = [

  // ══════════════════════════════════════════════════════════════
  // EVOLUTE (российский бренд, завод в Липецке)
  // ══════════════════════════════════════════════════════════════

  // i-PRO — седан на базе Dongfeng Aeolus E70 (= DFM Nissan Sylphy платформа)
  { id: 'evolute-ipro-2022', brand: 'Evolute', model: 'i-PRO', year: 2022, range: 433, consumption: 12.6, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Aeolus E70', notes: 'NEDC цикл. Реальный запас ~250-300 км' },
  { id: 'evolute-ipro-2023', brand: 'Evolute', model: 'i-PRO', year: 2023, range: 433, consumption: 12.6, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Aeolus E70' },

  // i-JOY — кроссовер на базе Dongfeng Fengon 500 / Seres 3
  { id: 'evolute-ijoy-2022', brand: 'Evolute', model: 'i-JOY', year: 2022, range: 405, consumption: 15.2, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Fengon 500 / Seres 3' },
  { id: 'evolute-ijoy-2023', brand: 'Evolute', model: 'i-JOY', year: 2023, range: 405, consumption: 15.2, battery: 53, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng Fengon 500 / Seres 3' },
  { id: 'evolute-ijoy-2024', brand: 'Evolute', model: 'i-JOY (российская батарея)', year: 2024, range: 480, consumption: 14.5, battery: 60, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Fengon 500', notes: 'Батарея от SAE (российская), +20% к запасу' },

  // i-SKY — кроссовер на базе Dongfeng Forthing Thunder (Leiting)
  { id: 'evolute-isky-85', brand: 'Evolute', model: 'i-SKY (85.9 кВт·ч)', year: 2023, range: 511, consumption: 18.3, battery: 85.9, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder' },
  { id: 'evolute-isky-city', brand: 'Evolute', model: 'i-SKY City Edition', year: 2023, range: 400, consumption: 17.5, battery: 64.4, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder', notes: 'LFP батарея, легче на 30 кг, режим кемпинга V2L 220В' },
  { id: 'evolute-isky-2024', brand: 'Evolute', model: 'i-SKY City Edition', year: 2024, range: 400, consumption: 17.5, battery: 64.4, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11, origin: 'Dongfeng Forthing Thunder' },
  { id: 'evolute-isky-2026', brand: 'Evolute', model: 'i-SKY (новый кузов)', year: 2026, range: 424, consumption: 16.8, battery: 62, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, origin: 'Dongfeng Forthing (обновл.)', notes: 'Новая версия 2026: 218 л.с., LFP батарея, зарядка 30-80% за 28 мин' },

  // i-VAN — электромикроавтобус на базе Dongfeng DFAC Fengon E17
  { id: 'evolute-ivan-2023', brand: 'Evolute', model: 'i-VAN', year: 2023, range: 270, consumption: 27.0, battery: 70.7, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7, origin: 'Dongfeng DFAC Fengon E17', notes: '7-местный микроавтобус' },

  // i-SPACE — гибрид на базе Dongfeng Fengon E5 PHEV
  { id: 'evolute-ispace-2024', brand: 'Evolute', model: 'i-SPACE', year: 2024, range: 87, consumption: 22.0, battery: 17.5, connector: 'GBT', maxChargeDC: 0, maxChargeAC: 6.6, origin: 'Dongfeng Fengon E5', isHybrid: true, notes: 'PHEV: 87 км чисто электро, 1150 км суммарно, 5.5 л/100 км ДВС' },

  // ══════════════════════════════════════════════════════════════
  // КИТАЙСКИЕ ОРИГИНАЛЫ EVOLUTE
  // ══════════════════════════════════════════════════════════════

  // Dongfeng (DFM)
  { id: 'dfm-aeolus-e70', brand: 'Dongfeng', model: 'Aeolus E70', year: 2022, range: 501, consumption: 15.8, battery: 70.2, connector: 'GBT', maxChargeDC: 80, origin: 'Оригинал i-PRO (расширенная батарея)' },
  { id: 'dfm-forthing-thunder', brand: 'Dongfeng', model: 'Forthing Thunder (Leiting)', year: 2023, range: 530, consumption: 17.2, battery: 85.9, connector: 'GBT', maxChargeDC: 100, origin: 'Оригинал i-SKY' },
  { id: 'dfm-nammi-01', brand: 'Dongfeng', model: 'Nammi 01', year: 2023, range: 401, consumption: 12.9, battery: 42.3, connector: 'GBT', maxChargeDC: 60 },
  { id: 'dfm-epi007', brand: 'Dongfeng', model: 'Eπ007', year: 2024, range: 620, consumption: 14.3, battery: 80.4, connector: 'GBT', maxChargeDC: 500 },
  { id: 'dfm-fengon-500', brand: 'Dongfeng', model: 'Fengon 500 EV', year: 2022, range: 400, consumption: 16.0, battery: 53, connector: 'GBT', maxChargeDC: 60, origin: 'Оригинал i-JOY' },

  // BAIC
  { id: 'baic-eu5-r600', brand: 'BAIC', model: 'EU5 R600', year: 2022, range: 416, consumption: 15.9, battery: 61.8, connector: 'GBT', maxChargeDC: 60 },
  { id: 'baic-ex360', brand: 'BAIC', model: 'EX360', year: 2021, range: 360, consumption: 16.1, battery: 52.8, connector: 'GBT', maxChargeDC: 60 },
  { id: 'baic-ex3', brand: 'BAIC', model: 'EX3', year: 2023, range: 400, consumption: 16.8, battery: 61.8, connector: 'GBT', maxChargeDC: 80 },
  { id: 'baic-eu7', brand: 'BAIC', model: 'EU7', year: 2023, range: 500, consumption: 16.5, battery: 70, connector: 'GBT', maxChargeDC: 80 },

  // GAC Aion
  { id: 'gac-aion-s', brand: 'GAC Aion', model: 'Aion S Plus', year: 2023, range: 602, consumption: 13.9, battery: 70.8, connector: 'GBT', maxChargeDC: 80 },
  { id: 'gac-aion-v', brand: 'GAC Aion', model: 'Aion V Plus', year: 2023, range: 602, consumption: 16.7, battery: 80, connector: 'GBT', maxChargeDC: 250 },
  { id: 'gac-aion-lx', brand: 'GAC Aion', model: 'Aion LX Plus', year: 2023, range: 650, consumption: 18.2, battery: 144, connector: 'GBT', maxChargeDC: 480 },
  { id: 'gac-aion-y', brand: 'GAC Aion', model: 'Aion Y', year: 2023, range: 510, consumption: 14.8, battery: 65, connector: 'GBT', maxChargeDC: 80 },

  // ══════════════════════════════════════════════════════════════
  // TESLA
  // ══════════════════════════════════════════════════════════════
  { id: 'tesla-m3-sr', brand: 'Tesla', model: 'Model 3 Standard Range', year: 2023, range: 491, consumption: 14.9, battery: 60, connector: 'CCS2', maxChargeDC: 170, maxChargeAC: 11 },
  { id: 'tesla-m3-lr', brand: 'Tesla', model: 'Model 3 Long Range', year: 2023, range: 629, consumption: 14.3, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { id: 'tesla-m3-perf', brand: 'Tesla', model: 'Model 3 Performance', year: 2023, range: 547, consumption: 15.7, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { id: 'tesla-my-sr', brand: 'Tesla', model: 'Model Y Standard Range', year: 2023, range: 430, consumption: 16.9, battery: 60, connector: 'CCS2', maxChargeDC: 170, maxChargeAC: 11 },
  { id: 'tesla-my-lr', brand: 'Tesla', model: 'Model Y Long Range', year: 2023, range: 533, consumption: 16.9, battery: 82, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { id: 'tesla-ms', brand: 'Tesla', model: 'Model S Long Range', year: 2023, range: 652, consumption: 17.1, battery: 100, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },
  { id: 'tesla-mx', brand: 'Tesla', model: 'Model X Long Range', year: 2023, range: 543, consumption: 20.5, battery: 100, connector: 'CCS2', maxChargeDC: 250, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // BYD
  // ══════════════════════════════════════════════════════════════
  { id: 'byd-han', brand: 'BYD', model: 'Han EV', year: 2023, range: 506, consumption: 16.6, battery: 85.4, connector: 'GBT', maxChargeDC: 120, maxChargeAC: 11 },
  { id: 'byd-seal', brand: 'BYD', model: 'Seal', year: 2023, range: 570, consumption: 15.1, battery: 82.5, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { id: 'byd-seal-u', brand: 'BYD', model: 'Seal U', year: 2024, range: 520, consumption: 17.2, battery: 82.5, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { id: 'byd-atto3', brand: 'BYD', model: 'Atto 3', year: 2023, range: 480, consumption: 16.5, battery: 60.5, connector: 'GBT', maxChargeDC: 80, maxChargeAC: 11 },
  { id: 'byd-dolphin', brand: 'BYD', model: 'Dolphin', year: 2023, range: 427, consumption: 14.8, battery: 60.4, connector: 'GBT', maxChargeDC: 60, maxChargeAC: 7 },
  { id: 'byd-tang', brand: 'BYD', model: 'Tang EV', year: 2023, range: 500, consumption: 21.8, battery: 108.8, connector: 'GBT', maxChargeDC: 110, maxChargeAC: 11 },
  { id: 'byd-song-plus', brand: 'BYD', model: 'Song Plus EV', year: 2023, range: 505, consumption: 17.5, battery: 71.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // ZEEKR
  // ══════════════════════════════════════════════════════════════
  { id: 'zeekr-001', brand: 'Zeekr', model: '001', year: 2023, range: 544, consumption: 19.3, battery: 100, connector: 'GBT', maxChargeDC: 200, maxChargeAC: 11 },
  { id: 'zeekr-007', brand: 'Zeekr', model: '007', year: 2024, range: 580, consumption: 14.8, battery: 75, connector: 'GBT', maxChargeDC: 500, maxChargeAC: 11 },
  { id: 'zeekr-x', brand: 'Zeekr', model: 'X', year: 2023, range: 440, consumption: 16.2, battery: 66, connector: 'GBT', maxChargeDC: 150, maxChargeAC: 11 },
  { id: 'zeekr-009', brand: 'Zeekr', model: '009', year: 2023, range: 700, consumption: 26.0, battery: 140, connector: 'GBT', maxChargeDC: 500, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // LI AUTO (Range Extender — EREV)
  // ══════════════════════════════════════════════════════════════
  { id: 'liato-l9', brand: 'Li Auto', model: 'L9', year: 2023, range: 215, consumption: 23.5, battery: 44.5, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true, notes: 'EREV: 215 км чисто EV, 1315 км суммарно' },
  { id: 'liato-l8', brand: 'Li Auto', model: 'L8', year: 2023, range: 215, consumption: 22.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { id: 'liato-l7', brand: 'Li Auto', model: 'L7', year: 2023, range: 212, consumption: 21.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { id: 'liato-mega', brand: 'Li Auto', model: 'MEGA', year: 2024, range: 710, consumption: 23.5, battery: 149, connector: 'GBT', maxChargeDC: 520, maxChargeAC: 11 },
  { id: 'liato-l6', brand: 'Li Auto', model: 'L6', year: 2024, range: 215, consumption: 20.5, battery: 42.8, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },

  // ══════════════════════════════════════════════════════════════
  // AITO (Huawei / Seres)
  // ══════════════════════════════════════════════════════════════
  { id: 'aito-m9', brand: 'Aito', model: 'M9 EV', year: 2024, range: 630, consumption: 21.0, battery: 100, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'aito-m9-erev', brand: 'Aito', model: 'M9 EREV', year: 2024, range: 150, consumption: 22.0, battery: 40, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { id: 'aito-m7', brand: 'Aito', model: 'M7', year: 2023, range: 150, consumption: 22.0, battery: 40, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11, isHybrid: true },
  { id: 'aito-m5', brand: 'Aito', model: 'M5 EV', year: 2023, range: 530, consumption: 18.5, battery: 80, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // VOYAH
  // ══════════════════════════════════════════════════════════════
  { id: 'voyah-free', brand: 'Voyah', model: 'Free EV', year: 2023, range: 500, consumption: 22.0, battery: 88.1, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'voyah-dream', brand: 'Voyah', model: 'Dream', year: 2023, range: 430, consumption: 29.5, battery: 116, connector: 'GBT', maxChargeDC: 100, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // NIO
  // ══════════════════════════════════════════════════════════════
  { id: 'nio-et5', brand: 'Nio', model: 'ET5', year: 2023, range: 560, consumption: 15.3, battery: 75, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { id: 'nio-et5t', brand: 'Nio', model: 'ET5T (Touring)', year: 2023, range: 520, consumption: 16.5, battery: 75, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { id: 'nio-et7', brand: 'Nio', model: 'ET7', year: 2023, range: 580, consumption: 19.0, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { id: 'nio-el6', brand: 'Nio', model: 'EL6', year: 2023, range: 579, consumption: 19.2, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },
  { id: 'nio-es8', brand: 'Nio', model: 'ES8', year: 2023, range: 580, consumption: 23.0, battery: 100, connector: 'GBT', maxChargeDC: 135, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // XPENG
  // ══════════════════════════════════════════════════════════════
  { id: 'xpeng-p7', brand: 'Xpeng', model: 'P7', year: 2023, range: 562, consumption: 15.2, battery: 80.9, connector: 'GBT', maxChargeDC: 120, maxChargeAC: 11 },
  { id: 'xpeng-g9', brand: 'Xpeng', model: 'G9', year: 2023, range: 520, consumption: 19.0, battery: 98, connector: 'GBT', maxChargeDC: 300, maxChargeAC: 11 },
  { id: 'xpeng-g6', brand: 'Xpeng', model: 'G6', year: 2023, range: 551, consumption: 15.8, battery: 87.5, connector: 'GBT', maxChargeDC: 270, maxChargeAC: 11 },
  { id: 'xpeng-x9', brand: 'Xpeng', model: 'X9', year: 2024, range: 702, consumption: 24.0, battery: 101, connector: 'GBT', maxChargeDC: 400, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // VOLKSWAGEN
  // ══════════════════════════════════════════════════════════════
  { id: 'vw-id3', brand: 'Volkswagen', model: 'ID.3', year: 2023, range: 426, consumption: 15.4, battery: 58, connector: 'CCS2', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'vw-id4', brand: 'Volkswagen', model: 'ID.4', year: 2023, range: 520, consumption: 17.9, battery: 77, connector: 'CCS2', maxChargeDC: 135, maxChargeAC: 11 },
  { id: 'vw-id6', brand: 'Volkswagen', model: 'ID.6', year: 2023, range: 490, consumption: 20.5, battery: 77, connector: 'CCS2', maxChargeDC: 135, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // BMW
  // ══════════════════════════════════════════════════════════════
  { id: 'bmw-ix40', brand: 'BMW', model: 'iX xDrive40', year: 2023, range: 425, consumption: 20.1, battery: 76.6, connector: 'CCS2', maxChargeDC: 150, maxChargeAC: 11 },
  { id: 'bmw-ix50', brand: 'BMW', model: 'iX xDrive50', year: 2023, range: 630, consumption: 20.6, battery: 111.5, connector: 'CCS2', maxChargeDC: 200, maxChargeAC: 11 },
  { id: 'bmw-i4-40', brand: 'BMW', model: 'i4 eDrive40', year: 2023, range: 590, consumption: 18.1, battery: 83.9, connector: 'CCS2', maxChargeDC: 200, maxChargeAC: 11 },
  { id: 'bmw-i4-m50', brand: 'BMW', model: 'i4 M50', year: 2023, range: 510, consumption: 19.8, battery: 83.9, connector: 'CCS2', maxChargeDC: 200, maxChargeAC: 11 },
  { id: 'bmw-i7', brand: 'BMW', model: 'i7 xDrive60', year: 2023, range: 625, consumption: 19.6, battery: 105.7, connector: 'CCS2', maxChargeDC: 195, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // HYUNDAI / KIA
  // ══════════════════════════════════════════════════════════════
  { id: 'hyundai-ioniq5-58', brand: 'Hyundai', model: 'IONIQ 5 58 kWh', year: 2023, range: 384, consumption: 16.8, battery: 58, connector: 'CCS2', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'hyundai-ioniq5-72', brand: 'Hyundai', model: 'IONIQ 5 72.6 kWh', year: 2023, range: 481, consumption: 17.0, battery: 72.6, connector: 'CCS2', maxChargeDC: 220, maxChargeAC: 11 },
  { id: 'hyundai-ioniq6', brand: 'Hyundai', model: 'IONIQ 6 Long Range', year: 2023, range: 614, consumption: 14.3, battery: 77.4, connector: 'CCS2', maxChargeDC: 230, maxChargeAC: 11 },
  { id: 'hyundai-kona', brand: 'Hyundai', model: 'Kona Electric', year: 2023, range: 514, consumption: 14.7, battery: 65.4, connector: 'CCS2', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'kia-ev6-sr', brand: 'Kia', model: 'EV6 Standard', year: 2023, range: 394, consumption: 17.0, battery: 58, connector: 'CCS2', maxChargeDC: 100, maxChargeAC: 11 },
  { id: 'kia-ev6-lr', brand: 'Kia', model: 'EV6 Long Range', year: 2023, range: 528, consumption: 16.5, battery: 77.4, connector: 'CCS2', maxChargeDC: 233, maxChargeAC: 11 },
  { id: 'kia-ev9', brand: 'Kia', model: 'EV9', year: 2024, range: 541, consumption: 22.1, battery: 99.8, connector: 'CCS2', maxChargeDC: 233, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // PORSCHE / AUDI
  // ══════════════════════════════════════════════════════════════
  { id: 'porsche-taycan', brand: 'Porsche', model: 'Taycan', year: 2023, range: 431, consumption: 24.6, battery: 93.4, connector: 'CCS2', maxChargeDC: 270, maxChargeAC: 11 },
  { id: 'porsche-taycan-4s', brand: 'Porsche', model: 'Taycan 4S', year: 2023, range: 463, consumption: 23.0, battery: 93.4, connector: 'CCS2', maxChargeDC: 270, maxChargeAC: 11 },
  { id: 'audi-etron55', brand: 'Audi', model: 'e-tron 55', year: 2023, range: 441, consumption: 24.0, battery: 95, connector: 'CCS2', maxChargeDC: 150, maxChargeAC: 11 },
  { id: 'audi-q4', brand: 'Audi', model: 'Q4 e-tron', year: 2023, range: 520, consumption: 17.3, battery: 82, connector: 'CCS2', maxChargeDC: 135, maxChargeAC: 11 },

  // ══════════════════════════════════════════════════════════════
  // NISSAN / RENAULT
  // ══════════════════════════════════════════════════════════════
  { id: 'nissan-leaf-40', brand: 'Nissan', model: 'Leaf 40 kWh', year: 2023, range: 270, consumption: 16.5, battery: 40, connector: 'CHAdeMO', maxChargeDC: 50, maxChargeAC: 7 },
  { id: 'nissan-leaf-62', brand: 'Nissan', model: 'Leaf 62 kWh', year: 2023, range: 385, consumption: 17.0, battery: 62, connector: 'CHAdeMO', maxChargeDC: 100, maxChargeAC: 7 },
  { id: 'nissan-ariya', brand: 'Nissan', model: 'Ariya 63 kWh', year: 2023, range: 403, consumption: 18.0, battery: 63, connector: 'CHAdeMO', maxChargeDC: 130, maxChargeAC: 11 },
  { id: 'renault-zoe', brand: 'Renault', model: 'Zoe 52 kWh', year: 2023, range: 395, consumption: 17.2, battery: 52, connector: 'CCS2', maxChargeDC: 50, maxChargeAC: 22 },
  { id: 'renault-megane', brand: 'Renault', model: 'Megane E-Tech', year: 2023, range: 470, consumption: 15.9, battery: 60, connector: 'CCS2', maxChargeDC: 130, maxChargeAC: 22 },
];

// ══════════════════════════════════════════════════════════════
// Вспомогательные функции
// ══════════════════════════════════════════════════════════════

export const EV_BRANDS = Array.from(new Set(EV_DATABASE.map(e => e.brand))).sort((a, b) => {
  // Российские марки первыми
  const ruFirst = ['Evolute'];
  if (ruFirst.includes(a) && !ruFirst.includes(b)) return -1;
  if (!ruFirst.includes(a) && ruFirst.includes(b)) return 1;
  return a.localeCompare(b, 'ru');
});

export function getModelsByBrand(brand: string): EVModel[] {
  return EV_DATABASE.filter(e => e.brand === brand).sort((a, b) => a.year - b.year);
}

// Сезонный коэффициент расхода
export function getRealConsumption(model: EVModel, season: 'summer' | 'winter' | 'mixed' = 'mixed'): number {
  const factor = season === 'winter' ? 1.35 : season === 'summer' ? 1.1 : 1.2;
  return Math.round(model.consumption * factor * 10) / 10;
}

// Реальный запас хода с учётом сезона
export function getRealRange(model: EVModel, season: 'summer' | 'winter' | 'mixed' = 'mixed'): number {
  const factor = season === 'winter' ? 0.67 : season === 'summer' ? 0.88 : 0.80;
  return Math.round(model.range * factor);
}

// Поиск по названию
export function searchEV(query: string): EVModel[] {
  const q = query.toLowerCase();
  return EV_DATABASE.filter(e =>
    e.brand.toLowerCase().includes(q) ||
    e.model.toLowerCase().includes(q) ||
    e.origin?.toLowerCase().includes(q)
  );
}

// Только чисто электрические (без гибридов)
export const EV_ONLY = EV_DATABASE.filter(e => !e.isHybrid);

export default EV_DATABASE;
