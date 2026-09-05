'use client';

import { useEffect, useRef, useState } from 'react';
import { AxiosError } from 'axios';
import { api } from '@/lib/api';
import { getErrorMessage } from '@/lib/errorMessages';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

interface AttendanceRecord {
  checkIn: string | null;
  checkOut: string | null;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

function formatElapsed(ms: number): string {
  const totalMinutes = Math.max(Math.floor(ms / 60_000), 0);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}

/**
 * Self check-in/out quick action. `/auth/me` doesn't expose the caller's
 * linked employeeId, so this can't pre-fetch "am I already checked in" on
 * load — state starts fresh each session and is set from the check-in/out
 * response. A 404 (no linked employee) hides the widget for this session.
 */
export function AttendanceWidget() {
  const { showToast } = useToast();
  const [available, setAvailable] = useState(true);
  const [checkInTime, setCheckInTime] = useState<Date | null>(null);
  const [elapsedLabel, setElapsedLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!checkInTime) {
      setElapsedLabel('');
      return;
    }
    const tick = () => setElapsedLabel(formatElapsed(Date.now() - checkInTime.getTime()));
    tick();
    intervalRef.current = setInterval(tick, 60_000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkInTime]);

  async function handleClick() {
    setIsSubmitting(true);
    try {
      if (checkInTime) {
        await api.post<{ data: AttendanceRecord }>('/attendance/check-out');
        setCheckInTime(null);
        showToast({ title: 'Checked out', variant: 'success' });
      } else {
        const { data } = await api.post<{ data: AttendanceRecord }>('/attendance/check-in');
        setCheckInTime(data.data.checkIn ? new Date(data.data.checkIn) : new Date());
        showToast({ title: 'Checked in', variant: 'success' });
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      if (axiosErr.response?.status === 404) {
        setAvailable(false);
        return;
      }
      showToast({
        title: 'Attendance action failed',
        description: getErrorMessage(axiosErr.response?.data?.error?.code, axiosErr.response?.data?.error?.message),
        variant: 'danger',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!available) return null;

  return (
    <div className="flex items-center gap-2">
      <span
        className={`h-2.5 w-2.5 shrink-0 rounded-full ${checkInTime ? 'bg-[var(--status-success-fg)]' : 'bg-[var(--text-tertiary)]'}`}
        aria-hidden="true"
      />
      {checkInTime && <span className="text-xs text-[var(--text-tertiary)]">{elapsedLabel}</span>}
      <Button variant="outline" size="sm" onClick={handleClick} isLoading={isSubmitting}>
        {checkInTime ? 'Check Out' : 'Check In'}
      </Button>
    </div>
  );
}
