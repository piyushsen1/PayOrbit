import { TimeOffTypeFormView } from '../TimeOffTypeFormView';

export default async function TimeOffTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TimeOffTypeFormView mode="edit" typeId={id} />;
}
