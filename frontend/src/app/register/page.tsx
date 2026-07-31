import dynamic from 'next/dynamic';

const Register = dynamic(() => import('./RegisterClient'), { ssr: false });

export default function RegisterPage() {
  return <Register />;
}
