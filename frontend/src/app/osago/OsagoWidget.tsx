'use client';
import { useEffect } from 'react';

export default function OsagoWidget() {
  useEffect(() => {
    // Удаляем старый если есть
    const old = document.getElementById('sravni-osago-script');
    if (old) old.remove();

    const s = document.createElement('script');
    s.id = 'sravni-osago-script';
    s.src = 'https://www.sravni.ru/widgets/loader.js';
    s.dataset.product = 'osago';
    s.dataset.isNewWl = 'true';
    s.dataset.inFrame = 'true';
    s.dataset.layout = 'short';
    s.dataset.theme = 'sravni_light';
    s.dataset.affSub = '9';
    s.dataset.offerId = '1064';
    s.dataset.source = '10640';
    s.dataset.affId = '101339';
    s.async = false;

    // Добавляем в body а не в div — виджет сам найдёт место
    document.body.appendChild(s);

    return () => {
      const el = document.getElementById('sravni-osago-script');
      if (el) el.remove();
    };
  }, []);

  return (
    <div id="sravni-widget-container" style={{ minHeight: 400 }}>
      <p className="text-sm text-muted text-center py-8">Загружаем калькулятор ОСАГО...</p>
    </div>
  );
}
