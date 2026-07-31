import dynamic from 'next/dynamic';

const Operators = dynamic(() => import('./OperatorsClient'), { ssr: false });

export default function OperatorsPage() {
  return <Operators />;
}
