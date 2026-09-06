'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getLandingRoute } from '@/lib/landingRoutes';
import { Container } from '@/components/layout/Container';
import { Skeleton } from '@/components/ui/Skeleton';

/**
 * Only reached by a direct visit to `/` while already signed in (e.g. the
 * logo link) — login itself navigates straight to the landing route and
 * never passes through here, avoiding a redundant hop.
 */
export default function HomePage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    router.replace(getLandingRoute(user.role));
  }, [isLoading, user, router]);

  return (
    <Container className="py-10">
      <Skeleton className="h-8 w-48" />
    </Container>
  );
}
