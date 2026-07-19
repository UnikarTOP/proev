/**
 * Создаёт или обновляет пользователя с доступом в /admin.
 *
 * Использование:
 *   npm run create-admin -- admin@proev.ru "надёжный-пароль" admin
 *   npm run create-admin -- moderator@proev.ru "другой-пароль" moderator
 *
 * Пароль передаётся аргументом командной строки — на проде делай это
 * через SSH-сессию (не в CI-логах и не в истории публичного скрипта).
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const [, , email, password, roleArg] = process.argv;
  const role = roleArg || 'admin';

  if (!email || !password) {
    console.error('Использование: npm run create-admin -- <email> <пароль> [admin|moderator]');
    process.exit(1);
  }
  if (!['admin', 'moderator'].includes(role)) {
    console.error('Роль должна быть "admin" или "moderator"');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Пароль слишком короткий (минимум 8 символов)');
    process.exit(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: role as any },
    create: { email, passwordHash, role: role as any, name: email.split('@')[0] },
  });

  console.log(`Готово: ${user.email} теперь роль "${user.role}" — можно логиниться на /admin`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
