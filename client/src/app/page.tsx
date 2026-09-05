'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';

export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
    } else if (user.role === 'admin') {
      router.replace('/users');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role === 'admin') {
    return (
      <Container className="py-10">
        <Skeleton className="h-8 w-48" />
      </Container>
    );
  }

  return (
    <Container className="py-10">
      <EmptyState
        title="You're signed in"
        description="Nothing to show here yet for your role — HR and payroll modules are still being built."
      />
    </Container>
  );
}
