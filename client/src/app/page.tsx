'use client';

import { useState } from 'react';
import { Line, LineChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { Container } from '@/components/layout/Container';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Card, CardHeader, CardTitle, CardDescription, CardBody, CardFooter } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Table, TableHead, TableBody, TableRow, TableHeaderCell, TableCell } from '@/components/ui/Table';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { useToast } from '@/components/ui/Toast';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ChartWrapper, CHART_COLORS, chartTheme } from '@/components/charts/ChartWrapper';

const SAMPLE_ROWS = [
  { id: '1', name: 'Ada Lovelace', role: 'admin', status: 'active' },
  { id: '2', name: 'Alan Turing', role: 'user', status: 'invited' },
];

const SAMPLE_SERIES = [
  { month: 'Jan', signups: 40, churn: 12 },
  { month: 'Feb', signups: 55, churn: 18 },
  { month: 'Mar', signups: 48, churn: 9 },
  { month: 'Apr', signups: 63, churn: 15 },
];

export default function HomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { showToast } = useToast();

  return (
    <Container className="flex flex-col gap-10 py-10">
      <section className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-text">Component kit</h1>
        <p className="text-text-muted">
          Every primitive, rendered with placeholder tokens — swap values in styles/tokens.css once real
          brand values arrive.
        </p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Buttons</h2>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="primary">Primary</Button>
          <Button variant="secondary">Secondary</Button>
          <Button variant="outline">Outline</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger">Danger</Button>
          <Button size="sm">Small</Button>
          <Button size="lg">Large</Button>
          <Button isLoading>Loading</Button>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Form controls</h2>
        <div className="grid max-w-md gap-4">
          <Input label="Email" placeholder="you@example.com" />
          <Input label="Password" type="password" error="Password must be at least 8 characters." />
          <Select
            label="Role"
            placeholder="Choose a role"
            options={[
              { value: 'user', label: 'User' },
              { value: 'admin', label: 'Admin' },
            ]}
          />
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Badges</h2>
        <div className="flex flex-wrap gap-2">
          <Badge variant="neutral">Neutral</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="danger">Danger</Badge>
          <Badge variant="info">Info</Badge>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Card</h2>
        <Card className="max-w-sm">
          <CardHeader>
            <CardTitle>Team plan</CardTitle>
            <CardDescription>Up to 10 seats included.</CardDescription>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-text-muted">Placeholder card body content.</p>
          </CardBody>
          <CardFooter>
            <Button size="sm">Upgrade</Button>
          </CardFooter>
        </Card>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Table</h2>
        <Table>
          <TableHead>
            <TableRow>
              <TableHeaderCell>Name</TableHeaderCell>
              <TableHeaderCell>Role</TableHeaderCell>
              <TableHeaderCell>Status</TableHeaderCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {SAMPLE_ROWS.map((row) => (
              <TableRow key={row.id}>
                <TableCell>{row.name}</TableCell>
                <TableCell className="capitalize">{row.role}</TableCell>
                <TableCell>
                  <Badge variant={row.status === 'active' ? 'success' : 'neutral'}>{row.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Tabs</h2>
        <Tabs defaultValue="overview" className="max-w-md">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <p className="text-sm text-text-muted">Overview panel content.</p>
          </TabsContent>
          <TabsContent value="activity">
            <p className="text-sm text-text-muted">Activity panel content.</p>
          </TabsContent>
        </Tabs>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Modal &amp; Toast</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setIsModalOpen(true)}>Open modal</Button>
          <Button
            variant="secondary"
            onClick={() => showToast({ title: 'Saved', description: 'Your changes were saved.', variant: 'success' })}
          >
            Show success toast
          </Button>
          <Button
            variant="secondary"
            onClick={() => showToast({ title: 'Something went wrong', variant: 'danger' })}
          >
            Show error toast
          </Button>
        </div>
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Example modal">
          <p className="text-sm text-text-muted">Placeholder modal content.</p>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </div>
        </Modal>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Skeleton &amp; empty state</h2>
        <div className="flex flex-col gap-2 max-w-sm">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <EmptyState title="No records yet" description="Create your first record to see it here." />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-semibold text-text">Chart</h2>
        <Card className="p-4">
          <ChartWrapper height={280}>
            <LineChart data={SAMPLE_SERIES}>
              <CartesianGrid stroke={chartTheme.grid} strokeDasharray="3 3" />
              <XAxis dataKey="month" stroke={chartTheme.axis} tick={{ fill: chartTheme.tick }} />
              <YAxis stroke={chartTheme.axis} tick={{ fill: chartTheme.tick }} />
              <Tooltip contentStyle={chartTheme.tooltipContentStyle} labelStyle={chartTheme.tooltipLabelStyle} />
              <Legend />
              <Line type="monotone" dataKey="signups" stroke={CHART_COLORS[0]} strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="churn" stroke={CHART_COLORS[1]} strokeWidth={2} dot={false} />
            </LineChart>
          </ChartWrapper>
        </Card>
      </section>
    </Container>
  );
}
