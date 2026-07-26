import { redirect } from 'next/navigation';

// /blog перенаправляет на /news — единая лента контента
export default function BlogPage() {
  redirect('/news');
}
