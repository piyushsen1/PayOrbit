'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AxiosError } from 'axios';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

type Role = 'employee' | 'hr_manager' | 'hr_payroll_user' | 'hr_payroll_manager' | 'admin';

const READ_ROLES: Role[] = ['hr_payroll_user', 'hr_payroll_manager', 'admin'];
const MANAGE_ROLES: Role[] = ['hr_payroll_manager', 'admin'];

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
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const CATEGORY_LABELS: Record<string, string> = {
  basic: 'Basic',
  allowance: 'Allowance',
  deduction: 'Deduction',
  gross: 'Gross',
  net: 'Net',
};

function SearchIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4 shrink-0 text-[var(--text-tertiary)]">
      <circle cx="9" cy="9" r="6" />
      <path d="M17 17l-4-4" strokeLinecap="round" />
    </svg>
  );
}

export default function SalaryRulesPage() {
  return (
    <Suspense
      fallback={
        <Container className="flex flex-col gap-3 py-10">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </Container>
      }
    >
      <SalaryRulesPageContent />
    </Suspense>
  );
}

function SalaryRulesPageContent() {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const structureIdFilter = searchParams.get('salaryStructureId') ?? undefined;

  const [rules, setRules] = useState<SalaryRule[]>([]);
  const [structures, setStructures] = useState<SalaryStructure[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const canView = !!user && READ_ROLES.includes(user.role);
  const canManage = !!user && MANAGE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [rulesRes, structuresRes] = await Promise.all([
        api.get<{ data: SalaryRule[] }>('/salary-rules', {
          params: structureIdFilter ? { salaryStructureId: structureIdFilter } : {},
        }),
        api.get<{ data: SalaryStructure[] }>('/salary-structures'),
      ]);
      setRules(rulesRes.data.data);
      setStructures(structuresRes.data.data);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: 'Failed to load salary rules',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsLoading(false);
    }
  }, [structureIdFilter, showToast]);

  useEffect(() => {
    if (canView) loadData();
  }, [canView, loadData]);

  const structureNameById = useMemo(() => new Map(structures.map((s) => [s.id, s.name])), [structures]);

  const filtered = useMemo(() => {
    if (!search) return rules;
    const needle = search.toLowerCase();
    return rules.filter((r) => `${r.name} ${r.code}`.toLowerCase().includes(needle));
  }, [rules, search]);

  if (authLoading) return null;

  if (!canView) {
    return (
      <Container className="py-10">
        <EmptyState title="Not authorized" description="Salary Rules is only available to payroll roles." />
      </Container>
    );
  }

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Salary Rules</h1>
        <p className="text-xs text-[var(--text-tertiary)]">Catalog of rules{structureIdFilter ? ' for this structure' : ''}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {canManage && (
          <Button
            onClick={() =>
              router.push(structureIdFilter ? `/salary-rules/new?salaryStructureId=${structureIdFilter}` : '/salary-rules/new')
            }
          >
            + New
          </Button>
        )}

        <div className="flex min-w-[260px] flex-1 items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface-card)] px-4 py-3">
          <SearchIcon />
          <input
            placeholder="Search rules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-tertiary)]"
          />
        </div>
      </div>

      {isLoading ? (
        <Skeleton className="h-64 w-full" />
      ) : filtered.length === 0 ? (
        <EmptyState title="No salary rules yet" description="Create the first rule to get started." />
      ) : (
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Rule Name</TableHeaderCell>
              <TableHeaderCell>Code</TableHeaderCell>
              <TableHeaderCell>Category</TableHeaderCell>
              <TableHeaderCell>Structure</TableHeaderCell>
              <TableHeaderCell>Sequence</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((r) => (
              <TableRow key={r.id} className="cursor-pointer" onClick={() => router.push(`/salary-rules/${r.id}`)}>
                <TableCell className="font-medium">{r.name}</TableCell>
                <TableCell className="num">{r.code}</TableCell>
                <TableCell>{CATEGORY_LABELS[r.category] ?? r.category}</TableCell>
                <TableCell>{structureNameById.get(r.salaryStructureId) ?? '—'}</TableCell>
                <TableCell className="num">{r.sequence}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Container>
  );
}
