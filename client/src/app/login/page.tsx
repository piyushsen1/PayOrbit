'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { useAuth } from '@/hooks/useAuth';
import { Container } from '@/components/layout/Container';
import { Card, CardHeader, CardTitle, CardDescription, CardBody } from '@/components/ui/Card';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { getErrorMessage } from '@/lib/errorMessages';

const credentialsSchema = z.object({
  email: z.string().email('Enter a valid email address.'),
  password: z.string().min(1, 'Password is required.'),
});

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function LoginPage() {
  const { login, signup } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(mode: 'login' | 'signup', e: FormEvent) {
    e.preventDefault();
    setFormError(undefined);
    setFieldError(undefined);

    const parsed = credentialsSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldError(parsed.error.issues[0]?.message);
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await login(parsed.data.email, parsed.data.password);
      } else {
        await signup(parsed.data.email, parsed.data.password);
      }
      router.push('/');
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Welcome</CardTitle>
          <CardDescription>Sign in or create an account to continue.</CardDescription>
        </CardHeader>
        <CardBody>
          <Tabs defaultValue="login">
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="login">Log in</TabsTrigger>
              <TabsTrigger value="signup">Sign up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form className="flex flex-col gap-4" onSubmit={(e) => handleSubmit('login', e)}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldError}
                  autoComplete="current-password"
                />
                {formError && <p className="text-sm text-danger">{formError}</p>}
                <Button type="submit" isLoading={isSubmitting}>
                  Log in
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form className="flex flex-col gap-4" onSubmit={(e) => handleSubmit('signup', e)}>
                <Input
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={fieldError}
                  hint="At least 8 characters."
                  autoComplete="new-password"
                />
                {formError && <p className="text-sm text-danger">{formError}</p>}
                <Button type="submit" isLoading={isSubmitting}>
                  Sign up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardBody>
      </Card>
    </Container>
  );
}
