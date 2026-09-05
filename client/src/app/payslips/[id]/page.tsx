import { PayslipDetailView } from '../PayslipDetailView';

export default async function PayslipDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayslipDetailView payslipId={id} />;
}
