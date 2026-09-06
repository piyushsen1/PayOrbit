"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AxiosError } from "axios";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { api } from "@/lib/api";
import { getErrorMessage } from "@/lib/errorMessages";
import { Container } from "@/components/layout/Container";
import { Card, CardBody } from "@/components/ui/Card";
import { BackButton } from "@/components/ui/BackButton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/Tabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";

type Role =
  | "employee"
  | "hr_manager"
  | "hr_payroll_user"
  | "hr_payroll_manager"
  | "admin";
type Status = "active" | "inactive";
type EmployeeType = "full_time" | "part_time" | "contract" | "intern";

interface Employee {
  id: string;
  fullName: string;
  workEmail: string;
  jobPosition: string | null;
  department: string | null;
  status: Status;
  employeeType: EmployeeType;
  managerId: string | null;
  workingScheduleId: string | null;
  workLocation: string | null;
  company: string | null;
  phone: string | null;
  personalEmail: string | null;
  homeAddress: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  bankAccountNumber: string | null;
}

interface WorkingSchedule {
  id: string;
  name: string;
  weeklyHours: string;
  status?: Status;
}

interface ApiErrorBody {
  error: { code: string; message: string };
}

const EMPLOYEE_MODULE_ROLES: Role[] = [
  "hr_manager",
  "hr_payroll_user",
  "hr_payroll_manager",
  "admin",
];

const EMPLOYEE_TYPE_OPTIONS: { value: EmployeeType; label: string }[] = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
  { value: "contract", label: "Contract" },
  { value: "intern", label: "Intern" },
];

interface FormState {
  fullName: string;
  workEmail: string;
  jobPosition: string;
  department: string;
  status: Status;
  employeeType: EmployeeType;
  managerId: string;
  workingScheduleId: string;
  workLocation: string;
  company: string;
  phone: string;
  personalEmail: string;
  homeAddress: string;
  dateOfBirth: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  bankAccountNumber: string;
}

function emptyForm(): FormState {
  return {
    fullName: "",
    workEmail: "",
    jobPosition: "",
    department: "",
    status: "active",
    employeeType: "full_time",
    managerId: "",
    workingScheduleId: "",
    workLocation: "",
    company: "",
    phone: "",
    personalEmail: "",
    homeAddress: "",
    dateOfBirth: "",
    emergencyContactName: "",
    emergencyContactPhone: "",
    bankAccountNumber: "",
  };
}

function toFormState(employee: Employee): FormState {
  return {
    fullName: employee.fullName,
    workEmail: employee.workEmail,
    jobPosition: employee.jobPosition ?? "",
    department: employee.department ?? "",
    status: employee.status,
    employeeType: employee.employeeType,
    managerId: employee.managerId ?? "",
    workingScheduleId: employee.workingScheduleId ?? "",
    workLocation: employee.workLocation ?? "",
    company: employee.company ?? "",
    phone: employee.phone ?? "",
    personalEmail: employee.personalEmail ?? "",
    homeAddress: employee.homeAddress ?? "",
    dateOfBirth: employee.dateOfBirth ?? "",
    emergencyContactName: employee.emergencyContactName ?? "",
    emergencyContactPhone: employee.emergencyContactPhone ?? "",
    bankAccountNumber: employee.bankAccountNumber ?? "",
  };
}

const PHONE_REGEX = /^\+?[0-9()\-\s]{7,20}$/;
const BANK_ACCOUNT_REGEX = /^[0-9]{6,20}$/;

const PRIVATE_TAB_FIELDS = new Set<keyof FormState>([
  "personalEmail",
  "phone",
  "homeAddress",
  "dateOfBirth",
  "emergencyContactName",
  "emergencyContactPhone",
  "bankAccountNumber",
]);

function calculateAge(dob: string): number {
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

/** All fields are strings in FormState; an empty string means "not provided" and is always valid for optional fields — only non-empty values are format-checked. */
const employeeSchema = z
  .object({
    fullName: z.string().trim().min(1, "Full name is required.").max(100, "Full name must be under 100 characters."),
    workEmail: z.string().trim().email("Enter a valid work email address."),
    personalEmail: z.string(),
    phone: z.string(),
    emergencyContactPhone: z.string(),
    dateOfBirth: z.string(),
    bankAccountNumber: z.string(),
  })
  .superRefine((data, ctx) => {
    if (data.personalEmail && !z.string().email().safeParse(data.personalEmail).success) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["personalEmail"], message: "Enter a valid personal email address." });
    }
    if (data.phone && !PHONE_REGEX.test(data.phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "Enter a valid phone number." });
    }
    if (data.emergencyContactPhone && !PHONE_REGEX.test(data.emergencyContactPhone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["emergencyContactPhone"], message: "Enter a valid phone number." });
    }
    if (data.bankAccountNumber && !BANK_ACCOUNT_REGEX.test(data.bankAccountNumber)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["bankAccountNumber"], message: "Bank account number must be 6-20 digits." });
    }
    if (data.dateOfBirth) {
      const parsed = new Date(data.dateOfBirth);
      if (Number.isNaN(parsed.getTime())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateOfBirth"], message: "Enter a valid date of birth." });
      } else if (parsed.getTime() > Date.now()) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateOfBirth"], message: "Date of birth cannot be in the future." });
      } else if (calculateAge(data.dateOfBirth) < 15) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateOfBirth"], message: "Employee must be at least 15 years old." });
      }
    }
  });

function buildPayload(form: FormState) {
  return {
    fullName: form.fullName,
    workEmail: form.workEmail,
    jobPosition: form.jobPosition || null,
    department: form.department || null,
    status: form.status,
    employeeType: form.employeeType,
    managerId: form.managerId || null,
    workingScheduleId: form.workingScheduleId || null,
    workLocation: form.workLocation || null,
    company: form.company || null,
    phone: form.phone || null,
    personalEmail: form.personalEmail || null,
    homeAddress: form.homeAddress || null,
    dateOfBirth: form.dateOfBirth || null,
    emergencyContactName: form.emergencyContactName || null,
    emergencyContactPhone: form.emergencyContactPhone || null,
    bankAccountNumber: form.bankAccountNumber || null,
  };
}

export interface EmployeeFormViewProps {
  mode: "create" | "edit";
  employeeId?: string;
}

export function EmployeeFormView({ mode, employeeId }: EmployeeFormViewProps) {
  const { user, isLoading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();

  const [allEmployees, setAllEmployees] = useState<Employee[]>([]);
  const [workingSchedules, setWorkingSchedules] = useState<WorkingSchedule[]>(
    [],
  );
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [isEditing, setIsEditing] = useState(mode === "create");
  const [tab, setTab] = useState("work");
  const [form, setForm] = useState<FormState>(emptyForm());
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [contractsCount, setContractsCount] = useState(0);
  const [timeOffCount, setTimeOffCount] = useState(0);
  const [attendanceCount, setAttendanceCount] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  const canAccess = !!user && EMPLOYEE_MODULE_ROLES.includes(user.role);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      let employeeData: Employee | null = null;

      if (mode === "edit" && employeeId) {
        try {
          const { data } = await api.get<{ data: Employee }>(
            `/employees/${employeeId}`,
          );
          employeeData = data.data;
        } catch (err) {
          const axiosErr = err as AxiosError<ApiErrorBody>;
          if (axiosErr.response?.status === 404) {
            setNotFound(true);
            return;
          }
          throw err;
        }
      }

      const [employeesRes, schedulesRes] = await Promise.all([
        api.get<{ data: Employee[] }>("/employees", { params: { limit: 100, status: "active" } }),
        api
          .get<{ data: WorkingSchedule[] }>("/working-schedules", { params: { limit: 100, status: "active" } })
          .catch(() => ({ data: { data: [] as WorkingSchedule[] } })),
      ]);

      let employees = employeesRes.data.data;
      let schedules = schedulesRes.data.data;

      // Preserve the employee's currently-assigned manager/schedule even if
      // they've since gone inactive, so editing doesn't look like the
      // assignment was silently wiped (or risk clearing it on save).
      const managerId = employeeData?.managerId;
      if (managerId && !employees.some((e) => e.id === managerId)) {
        try {
          const { data } = await api.get<{ data: Employee }>(`/employees/${managerId}`);
          employees = [...employees, data.data];
        } catch {
          // manager record unavailable — leave options as-is
        }
      }

      const workingScheduleId = employeeData?.workingScheduleId;
      if (workingScheduleId && !schedules.some((s) => s.id === workingScheduleId)) {
        try {
          const { data } = await api.get<{ data: WorkingSchedule }>(`/working-schedules/${workingScheduleId}`);
          schedules = [...schedules, data.data];
        } catch {
          // schedule record unavailable — leave options as-is
        }
      }

      setAllEmployees(employees);
      setWorkingSchedules(schedules);

      if (employeeData) {
        setEmployee(employeeData);
        setForm(toFormState(employeeData));

        const [contractsRes, timeOffRes, attendanceRes] = await Promise.all([
          api
            .get<{ data: unknown[] }>("/contracts", { params: { employeeId } })
            .catch(() => ({ data: { data: [] as unknown[] } })),
          api
            .get<{ data: unknown[] }>("/time-off-requests", { params: { employeeId } })
            .catch(() => ({ data: { data: [] as unknown[] } })),
          api
            .get<{ data: unknown[] }>("/attendance", { params: { employeeId } })
            .catch(() => ({ data: { data: [] as unknown[] } })),
        ]);
        setContractsCount(contractsRes.data.data.length);
        setTimeOffCount(timeOffRes.data.data.length);
        setAttendanceCount(attendanceRes.data.data.length);
      }
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: "Failed to load employee data",
        description: getErrorMessage(
          axiosErr.response?.data?.error?.code,
          axiosErr.response?.data?.error?.message,
        ),
        variant: "danger",
      });
    } finally {
      setIsLoading(false);
    }
  }, [mode, employeeId, showToast]);

  useEffect(() => {
    if (canAccess) loadData();
  }, [canAccess, loadData]);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setFieldErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function validateForm(): boolean {
    const parsed = employeeSchema.safeParse(form);
    if (parsed.success) {
      setFieldErrors({});
      return true;
    }
    const errors: Partial<Record<keyof FormState, string>> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0] as keyof FormState;
      if (!errors[key]) errors[key] = issue.message;
    }
    setFieldErrors(errors);
    const firstErrorField = parsed.error.issues[0]?.path[0] as keyof FormState | undefined;
    if (firstErrorField && PRIVATE_TAB_FIELDS.has(firstErrorField)) {
      setTab("private");
    }
    return false;
  }

  function handleCancel() {
    if (employee) setForm(toFormState(employee));
    setFieldErrors({});
    setIsEditing(false);
  }

  async function handleCreate() {
    if (!validateForm()) {
      showToast({ title: "Please fix the highlighted fields.", variant: "danger" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.post<{ data: Employee }>(
        "/employees",
        buildPayload(form),
      );
      showToast({ title: "Employee created", variant: "success" });
      router.push(`/employees/${data.data.id}`);
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: "Failed to create employee",
        description: getErrorMessage(
          axiosErr.response?.data?.error?.code,
          axiosErr.response?.data?.error?.message,
        ),
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!employee) return;
    if (!window.confirm("Delete this employee? This cannot be undone.")) return;
    setIsDeleting(true);
    try {
      await api.delete(`/employees/${employee.id}`);
      showToast({ title: "Employee deleted", variant: "success" });
      router.push("/employees");
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: "Failed to delete employee",
        description: getErrorMessage(
          axiosErr.response?.data?.error?.code,
          axiosErr.response?.data?.error?.message,
        ),
        variant: "danger",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  async function handleSaveEdit() {
    if (!employee) return;
    if (!validateForm()) {
      showToast({ title: "Please fix the highlighted fields.", variant: "danger" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { data } = await api.patch<{ data: Employee }>(
        `/employees/${employee.id}`,
        buildPayload(form),
      );
      setEmployee(data.data);
      setForm(toFormState(data.data));
      setIsEditing(false);
      showToast({ title: "Employee updated", variant: "success" });
    } catch (err) {
      const axiosErr = err as AxiosError<ApiErrorBody>;
      showToast({
        title: "Failed to save changes",
        description: getErrorMessage(
          axiosErr.response?.data?.error?.code,
          axiosErr.response?.data?.error?.message,
        ),
        variant: "danger",
      });
    } finally {
      setIsSubmitting(false);
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

  if (!canAccess) {
    return (
      <Container className="py-10">
        <EmptyState
          title="Not authorized"
          description="Employees is only available to HR and payroll roles."
        />
      </Container>
    );
  }

  if (mode === "edit" && notFound) {
    return (
      <Container className="py-10">
        <EmptyState
          title="Employee not found"
          description="It may have been removed."
        />
      </Container>
    );
  }

  const managerOptions = allEmployees
    .filter((e) => e.id !== employeeId)
    .map((e) => ({
      value: e.id,
      label: e.status === "inactive" ? `${e.fullName} (Inactive)` : e.fullName,
    }));

  const scheduleOptions = workingSchedules.map((s) => ({
    value: s.id,
    label:
      s.status === "inactive"
        ? `${s.name} (${s.weeklyHours}h/week) (Inactive)`
        : `${s.name} (${s.weeklyHours}h/week)`,
  }));

  const readOnly = mode === "edit" && !isEditing;

  return (
    <Container className="flex flex-col gap-6 py-10">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-2">
          <BackButton href="/employees" label="Back to Employees" />
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
            {mode === "create"
              ? "New Employee"
              : `Employee / ${employee?.fullName}`}
          </h1>
          <p className="text-xs text-[var(--text-tertiary)]">
            {mode === "create"
              ? "Create a new employee record"
              : "Main employee form with related HR actions"}
          </p>
        </div>

        {mode === "edit" && (
          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/time-off-requests?employeeId=${employeeId}`)
                }
              >
                Time Off {timeOffCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/contracts?employeeId=${employeeId}`)
                }
              >
                Contracts {contractsCount}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  router.push(`/attendance?employeeId=${employeeId}`)
                }
              >
                Attendance {attendanceCount}
              </Button>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleDelete}
              isLoading={isDeleting}
            >
              Delete
            </Button>
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                Edit
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  isLoading={isSubmitting}
                >
                  Save
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      <Card>
        <CardBody className="flex flex-col gap-6">
          <div className="flex items-center gap-4">
            <Avatar name={form.fullName || "?"} size="lg" />
            <div>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {form.fullName || "Unnamed employee"}
              </p>
              <p className="text-sm text-[var(--text-secondary)]">
                {form.jobPosition || "—"} • {form.department || "—"}
              </p>
              <p className="text-xs text-[var(--text-tertiary)]">
                {form.workEmail || "—"} {form.phone && `| ${form.phone}`}
              </p>
            </div>
          </div>

          {mode === "create" && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Input
                label="Full Name *"
                value={form.fullName}
                error={fieldErrors.fullName}
                onChange={(e) => setField("fullName", e.target.value)}
              />
              <Input
                label="Work Email *"
                type="email"
                value={form.workEmail}
                error={fieldErrors.workEmail}
                onChange={(e) => setField("workEmail", e.target.value)}
              />
            </div>
          )}

          <Tabs defaultValue="work" value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="work">Work Information</TabsTrigger>
              <TabsTrigger value="private">Private Information</TabsTrigger>
            </TabsList>

            <TabsContent value="work">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Department"
                  value={form.department}
                  disabled={readOnly}
                  onChange={(e) => setField("department", e.target.value)}
                />
                <Input
                  label="Job Position"
                  value={form.jobPosition}
                  disabled={readOnly}
                  onChange={(e) => setField("jobPosition", e.target.value)}
                />
                <Select
                  label="Employee Type"
                  options={EMPLOYEE_TYPE_OPTIONS}
                  value={form.employeeType}
                  disabled={readOnly}
                  onChange={(e) => setField("employeeType", e.target.value as EmployeeType)}
                />
                <Select
                  label="Manager"
                  placeholder="Select manager"
                  options={managerOptions}
                  value={form.managerId}
                  disabled={readOnly}
                  onChange={(e) => setField("managerId", e.target.value)}
                />
                <Input
                  label="Work Location"
                  value={form.workLocation}
                  disabled={readOnly}
                  onChange={(e) => setField("workLocation", e.target.value)}
                />
                <Select
                  label="Working Schedule"
                  placeholder="Select working schedule"
                  options={scheduleOptions}
                  value={form.workingScheduleId}
                  disabled={readOnly}
                  onChange={(e) =>
                    setField("workingScheduleId", e.target.value)
                  }
                />
                {mode === "edit" ? (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
                      Status
                    </span>
                    <button
                      type="button"
                      disabled={readOnly}
                      onClick={() =>
                        setField(
                          "status",
                          form.status === "active" ? "inactive" : "active",
                        )
                      }
                      className="w-fit disabled:cursor-not-allowed"
                    >
                      <Badge
                        variant={
                          form.status === "active" ? "success" : "neutral"
                        }
                        dot
                      >
                        {form.status === "active" ? "Active" : "Inactive"}
                      </Badge>
                    </button>
                  </div>
                ) : (
                  <div />
                )}
                <Input
                  label="Company"
                  value={form.company}
                  disabled={readOnly}
                  onChange={(e) => setField("company", e.target.value)}
                />
                {mode === "edit" && (
                  <Input
                    label="Work Email"
                    type="email"
                    value={form.workEmail}
                    disabled={readOnly}
                    error={fieldErrors.workEmail}
                    onChange={(e) => setField("workEmail", e.target.value)}
                  />
                )}
              </div>
            </TabsContent>

            <TabsContent value="private">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="Personal Email"
                  type="email"
                  value={form.personalEmail}
                  disabled={readOnly}
                  error={fieldErrors.personalEmail}
                  onChange={(e) => setField("personalEmail", e.target.value)}
                />
                <Input
                  label="Phone Number"
                  value={form.phone}
                  disabled={readOnly}
                  error={fieldErrors.phone}
                  hint={fieldErrors.phone ? undefined : "Digits only, optionally with +, spaces, dashes, or parentheses."}
                  onChange={(e) => setField("phone", e.target.value)}
                />
                <Input
                  label="Home Address"
                  value={form.homeAddress}
                  disabled={readOnly}
                  onChange={(e) => setField("homeAddress", e.target.value)}
                />
                <Input
                  label="Date of Birth"
                  type="date"
                  value={form.dateOfBirth}
                  disabled={readOnly}
                  error={fieldErrors.dateOfBirth}
                  onChange={(e) => setField("dateOfBirth", e.target.value)}
                />
                <Input
                  label="Emergency Contact Name"
                  value={form.emergencyContactName}
                  disabled={readOnly}
                  onChange={(e) =>
                    setField("emergencyContactName", e.target.value)
                  }
                />
                <Input
                  label="Emergency Contact Phone"
                  value={form.emergencyContactPhone}
                  disabled={readOnly}
                  error={fieldErrors.emergencyContactPhone}
                  onChange={(e) =>
                    setField("emergencyContactPhone", e.target.value)
                  }
                />
                <Input
                  label="Bank Account Number"
                  value={form.bankAccountNumber}
                  disabled={readOnly}
                  error={fieldErrors.bankAccountNumber}
                  hint={
                    fieldErrors.bankAccountNumber
                      ? undefined
                      : "Required for payroll — a missing value surfaces as a pay-run warning. Digits only, 6-20 characters."
                  }
                  onChange={(e) =>
                    setField("bankAccountNumber", e.target.value)
                  }
                />
              </div>
            </TabsContent>
          </Tabs>

          {mode === "create" && (
            <div className="flex justify-end">
              <Button onClick={handleCreate} isLoading={isSubmitting}>
                Create Employee
              </Button>
            </div>
          )}
        </CardBody>
      </Card>
    </Container>
  );
}
