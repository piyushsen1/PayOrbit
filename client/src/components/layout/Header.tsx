'use client';

import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/Button';
import { Container } from './Container';

export function Header() {
  const { user, isLoading, logout } = useAuth();

  return (
    <header className="border-b border-border bg-surface">
      <Container className="flex h-16 items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-text">
          PayOrbit
        </Link>
        <div className="flex items-center gap-3">
          {!isLoading && user && (
            <>
              <span className="text-sm text-text-muted">{user.email ?? user.id}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                Log out
              </Button>
            </>
          )}
          {!isLoading && !user && (
            <Link href="/login">
              <Button size="sm">Sign in</Button>
            </Link>
          )}
        </div>
      </Container>
    </header>
  );
}
