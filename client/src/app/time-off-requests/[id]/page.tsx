import { TimeOffRequestFormView } from '../TimeOffRequestFormView';

export default async function TimeOffRequestDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <TimeOffRequestFormView mode="edit" requestId={id} />;
}
