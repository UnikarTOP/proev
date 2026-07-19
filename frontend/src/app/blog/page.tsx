export const metadata = {
  title: 'Блог об электромобилях в России — proev.ru',
};

export default function BlogPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-2">Блог</h1>
      <p className="text-gray-600 mb-6">
        Гайды по выбору и эксплуатации электромобилей в российских условиях.
      </p>
      <p className="text-sm text-gray-500">
        TODO: подключить /api/articles и вывести список статей — см. articles.module.ts в бэкенде.
      </p>
    </div>
  );
}
