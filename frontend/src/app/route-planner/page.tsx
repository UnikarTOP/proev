import dynamic from 'next/dynamic';
const RoutePlanner = dynamic(() => import('./RoutePlannerClient'), { ssr: false });
export default function RoutePlannerPage() { return <RoutePlanner />; }
