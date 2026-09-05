import { SalaryStructureFormView } from '../SalaryStructureFormView';

export default async function SalaryStructureDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalaryStructureFormView mode="edit" structureId={id} />;
}
