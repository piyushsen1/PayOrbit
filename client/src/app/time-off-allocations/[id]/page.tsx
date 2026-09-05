import { TimeOffAllocationFormView } from '../TimeOffAllocationFormView';

export default async function TimeOffAllocationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TimeOffAllocationFormView mode="edit" allocationId={id} />;
}
