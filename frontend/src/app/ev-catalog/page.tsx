import dynamic from 'next/dynamic';

const EVCatalog = dynamic(() => import('./EVCatalogClient'), { ssr: false });

export default function EVCatalogPage() {
  return <EVCatalog />;
}
