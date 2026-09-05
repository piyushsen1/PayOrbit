import { EmployeeFormView } from '../EmployeeFormView';

export default async function EmployeeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EmployeeFormView mode="edit" employeeId={id} />;
}
