'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SalaryRuleFormView } from '../SalaryRuleFormView';

export default function NewSalaryRulePage() {
  return (
    <Suspense fallback={null}>
      <NewSalaryRulePageContent />
    </Suspense>
  );
}

function NewSalaryRulePageContent() {
  const searchParams = useSearchParams();
  const structureId = searchParams.get('salaryStructureId') ?? undefined;
  return <SalaryRuleFormView mode="create" initialStructureId={structureId} />;
}
