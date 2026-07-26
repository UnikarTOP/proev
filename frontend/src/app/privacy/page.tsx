import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Политика конфиденциальности — proev.ru',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-[720px] mx-auto px-4 md:px-6 py-10 md:py-16">
      <h1 className="text-2xl font-bold text-ink-900 mb-2">Политика конфиденциальности</h1>
      <p className="text-sm text-muted mb-8">Последнее обновление: июль 2026</p>

      <div className="prose space-y-6 text-sm text-muted leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">1. Общие положения</h2>
          <p>Настоящая Политика конфиденциальности описывает, как proev.ru (далее — «Платформа», «мы») собирает, использует и защищает персональные данные пользователей в соответствии с Федеральным законом от 27.07.2006 № 152-ФЗ «О персональных данных».</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">2. Какие данные мы собираем</h2>
          <p className="mb-2">При использовании Платформы мы можем собирать:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Имя и контактные данные (при отправке заявки партнёру)</li>
            <li>Адрес электронной почты (при регистрации партнёра)</li>
            <li>Технические данные: IP-адрес, тип браузера, страницы посещения</li>
            <li>Данные об использовании: действия на сайте, время сессий</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">3. Цели обработки</h2>
          <ul className="list-disc list-inside space-y-1">
            <li>Обработка заявок и передача их партнёрам</li>
            <li>Обеспечение работы личного кабинета партнёра</li>
            <li>Улучшение качества сервиса</li>
            <li>Отправка технических уведомлений</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">4. Передача данных третьим лицам</h2>
          <p>Данные из форм заявок передаются партнёру, к которому направлена заявка. Мы не продаём и не передаём персональные данные иным третьим лицам без вашего согласия, за исключением случаев, предусмотренных законодательством РФ.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">5. Хранение данных</h2>
          <p>Данные хранятся на серверах, расположенных на территории Российской Федерации. Срок хранения — 3 года с момента последнего взаимодействия, либо до отзыва согласия.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">6. Ваши права</h2>
          <p className="mb-2">В соответствии с 152-ФЗ вы вправе:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>Получить информацию о хранящихся данных</li>
            <li>Потребовать исправления или удаления данных</li>
            <li>Отозвать согласие на обработку</li>
            <li>Обратиться с жалобой в Роскомнадзор</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">7. Cookies</h2>
          <p>Мы используем необходимые файлы cookie для работы сессий. Аналитические cookie используются только с вашего согласия.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-ink-900 mb-3">8. Контакты</h2>
          <p>По вопросам обработки персональных данных обращайтесь: <a href="mailto:privacy@proev.ru" className="text-volt-600 underline underline-offset-2">privacy@proev.ru</a></p>
        </section>
      </div>
    </div>
  );
}
