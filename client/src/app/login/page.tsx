"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { getLandingRoute } from "@/lib/landingRoutes";
import { Container } from "@/components/layout/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { getErrorMessage } from "@/lib/errorMessages";

const credentialsSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

interface ApiErrorBody {
  error: { code: string; message: string };
}

export default function LoginPage() {
  const { user, isLoading, login } = useAuth();
  const router = useRouter();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // An already-authenticated session (e.g. a second tab, back button, or a
  // bookmark) shouldn't be able to sit on the login form with the real nav
  // rendered above it — bounce straight to the role's landing page.
  useEffect(() => {
    if (!isLoading && user) {
      router.replace(getLandingRoute(user.role));
    }
  }, [isLoading, user, router]);

  async function handleSubmit(e: FormEvent) {
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
      const user = await login(parsed.data.email, parsed.data.password);
      // Straight to the role's landing page — no intermediate hop through `/`
      // (which would otherwise mount, render a skeleton, then redirect again).
      router.push(getLandingRoute(user.role));
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      setFormError(
        getErrorMessage(
          axiosErr.response?.data?.error?.code,
          axiosErr.response?.data?.error?.message,
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container className="flex justify-center py-16">
      <Card className="w-full max-w-sm shadow-glow-lg">
        <CardBody className="flex flex-col gap-6 p-8">
          <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
            HR Portal
          </span>

          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
              Welcome back
            </h1>
            <p className="text-sm text-[var(--text-secondary)]">
              Sign in to continue to your workspace.
            </p>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <Input
              label="Work Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
            <div className="flex flex-col gap-1.5">
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={fieldError}
                autoComplete="current-password"
              />
              {/* <button
                type="button"
                onClick={() => showToast({ title: 'Not available yet', description: 'Password reset is a planned enhancement.', variant: 'neutral' })}
                className="self-end text-sm font-semibold text-[var(--text-link)] hover:text-[var(--primary-hover)] hover:underline"
              >
                Forgot password?
              </button> */}
            </div>
            {formError && (
              <p className="rounded-2xl bg-[var(--status-danger-bg)] px-4 py-3 text-sm text-[var(--status-danger-fg)]">
                {formError}
              </p>
            )}
            <Button type="submit" size="lg" isLoading={isSubmitting}>
              Sign In
            </Button>
          </form>

          <div className="flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-4 text-center">
            <p className="text-xs text-[var(--text-tertiary)]">
              Accounts are created by an administrator.
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              After sign-in, only the modules and actions allowed by your
              assigned role are shown.
            </p>
          </div>
        </CardBody>
      </Card>
    </Container>
  );
}
