import { ContractFormView } from '../ContractFormView';

export default async function ContractDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContractFormView mode="edit" contractId={id} />;
}
