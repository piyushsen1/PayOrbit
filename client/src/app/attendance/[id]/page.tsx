import { AttendanceFormView } from '../AttendanceFormView';

export default async function AttendanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendanceFormView mode="edit" attendanceId={id} />;
}
