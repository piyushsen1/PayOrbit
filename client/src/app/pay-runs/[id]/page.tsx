import { PayRunProcessingView } from '../PayRunProcessingView';

export default async function PayRunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <PayRunProcessingView payRunId={id} />;
}
