'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';

/** Where each role lands after sign-in — its most central screen. */
const LANDING_ROUTE_BY_ROLE: Record<string, string> = {
  admin: '/users',
  hr_payroll_manager: '/dashboard',
  hr_payroll_user: '/dashboard',
  hr_manager: '/employees',
  employee: '/time-off-requests',
};

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(LANDING_ROUTE_BY_ROLE[user.role] ?? '/time-off-requests');
  }, [isLoading, user, router]);

  return (
    <Container className="py-10">
      <Skeleton className="h-8 w-48" />
    </Container>
  );
}
