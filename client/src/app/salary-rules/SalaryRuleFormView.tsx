'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Card, CardBody } from '@/components/ui/Card';
import { BackButton } from '@/components/ui/BackButton';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const READ_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const MANAGE_ROLES: Role[] = ['hr_payroll_manager', 'admin'];

export const CATEGORY_OPTIONS = [
  { value: 'basic', label: 'Basic' },
  { value: 'allowance', label: 'Allowance' },
  { value: 'deduction', label: 'Deduction' },
  { value: 'gross', label: 'Gross' },
  { value: 'net', label: 'Net' },
];

const COMPUTATION_OPTIONS = [
  { value: 'fixed', label: 'Fixed Amount' },
  { value: 'percentage', label: 'Percentage of Wage' },
  { value: 'formula', label: 'Formula (Python Code)' },
];

interface SalaryStructure {
  id: string;
  name: string;
}

interface SalaryRule {
  id: string;
  name: string;
  code: string;
  category: string;
  sequence: number;
  salaryStructureId: string;
  computationMethod: string;
  value: string | null;
  formula: string | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

export interface SalaryRuleFormViewProps {
  mode: 'create' | 'edit';
  ruleId?: string;
  initialStructureId?: string;
}

export function SalaryRuleFormView({ mode, ruleId, initialStructureId }: SalaryRuleFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState('basic');
  const [sequence, setSequence] = useState('10');
  const [salaryStructureId, setSalaryStructureId] = useState(initialStructureId ?? '');
  const [computationMethod, setComputationMethod] = useState('fixed');
  const [value, setValue] = useState('');
  const [formula, setFormula] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canView = !!user && READ_ROLES.includes(user.role);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const structuresRes = await api.get<{ data: SalaryStructure[] }>('/salary-structures', { params: { limit: 100 } });
      setStructures(structuresRes.data.data);

      if (mode === 'edit' && ruleId) {
        try {
          const { data } = await api.get<{ data: SalaryRule }>(`/salary-rules/${ruleId}`);
          const r = data.data;
          setName(r.name);
          setCode(r.code);
          setCategory(r.category);
          setSequence(String(r.sequence));
          setSalaryStructureId(r.salaryStructureId);
          setComputationMethod(r.computationMethod);
          setValue(r.value ?? '');
          setFormula(r.formula ?? '');
        } catch (err) {
          const axiosErr = err as AxiosError<ApiErrorBody>;
          if (axiosErr.response?.status === 404) {
            setNotFound(true);
          } else {
            throw err;
          }
        }
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load salary rule data',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, ruleId, showToast]);

  useEffect(() => {
    if (canView) loadData();
  }, [canView, loadData]);

  async function handleSave() {
    setFormError(undefined);
    if (!name.trim()) {
      setFormError('Rule name is required.');
      return;
    }
    if (!code.trim()) {
      setFormError('Code is required.');
      return;
    }
    if (!salaryStructureId) {
      setFormError('Select a salary structure.');
      return;
    }
    if ((computationMethod === 'fixed' || computationMethod === 'percentage') && !value) {
      setFormError(`A value is required for the "${computationMethod}" computation method.`);
      return;
    }
    if (computationMethod === 'formula' && !formula.trim()) {
      setFormError('A formula is required for the "formula" computation method.');
      return;
    }

    const payload = {
      name,
      code,
      category,
      sequence: Number(sequence) || 0,
      salaryStructureId,
      computationMethod,
      value: computationMethod === 'formula' ? undefined : Number(value),
      formula: computationMethod === 'formula' ? formula : undefined,
    };

    setIsSubmitting(true);
    try {
      if (mode === 'create') {
        await api.post('/salary-rules', payload);
        showToast({ title: 'Salary rule created', variant: 'success' });
      } else if (ruleId) {
        await api.patch(`/salary-rules/${ruleId}`, payload);
        showToast({ title: 'Salary rule saved', variant: 'success' });
      }
      router.push(salaryStructureId ? `/salary-structures/${salaryStructureId}` : '/salary-rules');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!ruleId) return;
    if (!window.confirm('Delete this salary rule? This cannot be undone.')) return;
    setIsDeleting(true);
    try {
      await api.delete(`/salary-rules/${ruleId}`);
      showToast({ title: 'Salary rule deleted', variant: 'success' });
      router.push(salaryStructureId ? `/salary-structures/${salaryStructureId}` : '/salary-rules');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to delete salary rule',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  if (authLoading || isLoading) {
    return (
      <Container className="flex flex-col gap-3 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </Container>
    );
  }

  if (!canView) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Salary Rules is only available to payroll roles." />
      </Container>
    );
  }

  if (mode === 'edit' && notFound) {
    return (
      <Container className="py-10">
        <EmptyState title="Salary rule not found" description="It may have been removed." />
      </Container>
    );
  }

  const readOnly = !canManage;
  const structureOptions = structures.map((s) => ({ value: s.id, label: s.name }));

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-col gap-2">
        <BackButton href="/salary-rules" label="Back to Salary Rules" />
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
          {mode === 'create' ? 'New Salary Rule' : `Salary Rule / ${name}`}
        </h1>
        <p className="text-xs text-[var(--text-tertiary)]">One computation rule</p>
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input label="Rule Name *" value={name} disabled={readOnly} onChange={(e) => setName(e.target.value)} />
            <Input label="Code *" value={code} disabled={readOnly} onChange={(e) => setCode(e.target.value)} />
            <Select
              label="Category"
              options={CATEGORY_OPTIONS}
              value={category}
              disabled={readOnly}
              onChange={(e) => setCategory(e.target.value)}
            />
            <Input
              label="Sequence"
              type="number"
              value={sequence}
              disabled={readOnly}
              onChange={(e) => setSequence(e.target.value)}
            />
            <Select
              label="Salary Structure *"
              placeholder="Select salary structure"
              options={structureOptions}
              value={salaryStructureId}
              disabled={readOnly}
              onChange={(e) => setSalaryStructureId(e.target.value)}
            />
            <Select
              label="Computation"
              options={COMPUTATION_OPTIONS}
              value={computationMethod}
              disabled={readOnly}
              onChange={(e) => setComputationMethod(e.target.value)}
            />
            {(computationMethod === 'fixed' || computationMethod === 'percentage') && (
              <Input
                label={computationMethod === 'fixed' ? 'Amount' : 'Percentage of Wage'}
                type="number"
                value={value}
                disabled={readOnly}
                onChange={(e) => setValue(e.target.value)}
              />
            )}
          </div>

          {computationMethod === 'formula' && (
            <Textarea
              label="Formula (Python Code)"
              value={formula}
              disabled={readOnly}
              onChange={(e) => setFormula(e.target.value)}
            />
          )}

          {formError && (
            <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
              {formError}
            </p>
          )}

          <div className="flex justify-between gap-2">
            {mode === 'edit' && canManage ? (
              <Button variant="danger" onClick={handleDelete} isLoading={isDeleting}>
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(salaryStructureId ? `/salary-structures/${salaryStructureId}` : '/salary-rules')}
              >
                {readOnly ? 'Back' : 'Cancel'}
              </Button>
              {canManage && (
                <Button onClick={handleSave} isLoading={isSubmitting}>
                  {mode === 'create' ? 'Create Rule' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
