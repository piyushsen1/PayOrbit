import { WorkingScheduleFormView } from '../WorkingScheduleFormView';

export default async function WorkingScheduleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <WorkingScheduleFormView mode="edit" scheduleId={id} />;
}
