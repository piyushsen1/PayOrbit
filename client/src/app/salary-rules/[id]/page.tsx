import { SalaryRuleFormView } from '../SalaryRuleFormView';

export default async function SalaryRuleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SalaryRuleFormView mode="edit" ruleId={id} />;
}
