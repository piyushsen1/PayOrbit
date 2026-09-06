import { HolidayFormView } from '../HolidayFormView';

export default async function HolidayDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HolidayFormView mode="edit" holidayId={id} />;
}
