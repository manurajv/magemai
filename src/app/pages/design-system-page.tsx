import { useState } from "react";
import { businessNavigation } from "@/app/navigation/items";
import { ComingSoon } from "@/components/shared/coming-soon";
import { EmptyState } from "@/components/shared/empty-state";
import { ErrorState } from "@/components/shared/error-state";
import { Header } from "@/components/shared/header";
import { LoadingState, Skeleton, Spinner } from "@/components/shared/loading-state";
import { Logo } from "@/components/shared/logo";
import { Navigation } from "@/components/shared/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { DropdownMenu } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { brand } from "@/config/brand";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toast } from "@/lib/utilities/notify";

const tokenRows = [
  { name: "Primary", role: "Navy" },
  { name: "Foreground", role: "Charcoal" },
  { name: "Accent", role: "Deep teal" },
] as const;

export function DesignSystemPage() {
  useDocumentTitle("Design system");
  const [accent, setAccent] = useState("teal");

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-4 py-10">
      <PageHeader
        title="Design system"
        description="Development-only preview of the shared components. These samples are not business records."
      />
      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Brand</h2>
        <Logo />
        <p className="text-sm text-muted-foreground">{brand.tagline}</p>
        <p className="font-sans text-4xl font-semibold tracking-tight">Inter</p>
      </section>
      <section className="flex flex-wrap gap-3">
        <Button>Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="accent">Accent</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="destructive">Destructive</Button>
        <Button disabled>Disabled</Button>
      </section>
      <section className="grid gap-6 md:grid-cols-2">
        <Input
          label="Business name"
          placeholder="Shown as a field sample"
          hint="Validation arrives with the forms."
        />
        <Input label="Email" defaultValue="not-an-email" error="Enter a valid email address." />
        <Select
          label="Accent sample"
          value={accent}
          onValueChange={setAccent}
          options={[
            { value: "teal", label: "Deep teal" },
            { value: "navy", label: "Navy" },
          ]}
        />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Card</CardTitle>
          <CardDescription>Surfaces use the card token, not a one-off color.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm">Radius, border, and shadow come from the theme.</p>
        </CardContent>
        <CardFooter>
          <ComingSoon />
        </CardFooter>
      </Card>
      <section className="flex flex-wrap gap-3">
        <Dialog
          trigger={<Button variant="outline">Open dialog</Button>}
          title="Dialog"
          description="This dialog is a design sample."
        >
          <p className="text-sm">It does not save anything.</p>
        </Dialog>
        <DropdownMenu
          label="Sample menu"
          trigger={<Button variant="outline">Open menu</Button>}
          items={[
            { label: "First sample", onSelect: () => toast("Menu sample") },
            { label: "Disabled sample", disabled: true },
          ]}
        />
        <Button
          variant="accent"
          onClick={() =>
            toast("Notification", { description: "Toast sample from the design system." })
          }
        >
          Show toast
        </Button>
      </section>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Token</TableHead>
            <TableHead>Role</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tokenRows.map((row) => (
            <TableRow key={row.name}>
              <TableCell>{row.name}</TableCell>
              <TableCell>{row.role}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="overflow-hidden rounded-lg border border-border">
        <Header onOpenSidebar={() => undefined} />
      </div>
      <div className="max-w-xs rounded-lg bg-primary p-3">
        <Navigation items={businessNavigation} />
      </div>
      <LoadingState label="Loading workspace" />
      <div className="flex items-center gap-3">
        <Spinner />
        <Skeleton className="h-4 w-40" />
      </div>
      <EmptyState title="Nothing here" description="Empty states explain what is missing." />
      <ErrorState
        title="Something failed"
        message="Error states include a retry action."
        onRetry={() => toast("Retry sample")}
      />
    </div>
  );
}
