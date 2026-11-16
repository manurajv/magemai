import {
  BarChart3,
  Briefcase,
  Calendar,
  CalendarCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Shield,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export type NavItem =
  | { label: string; icon: LucideIcon; to: string }
  | { label: string; icon: LucideIcon; comingSoon: true };

export const businessNavigation = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin" },
  { label: "Services", icon: Briefcase, comingSoon: true },
  { label: "Packages", icon: Package, comingSoon: true },
  { label: "Bookings", icon: CalendarCheck, comingSoon: true },
  { label: "Calendar", icon: Calendar, comingSoon: true },
  { label: "Customers", icon: Users, comingSoon: true },
  { label: "Team", icon: UserRound, comingSoon: true },
  { label: "Finances", icon: Wallet, comingSoon: true },
  { label: "Invoices", icon: FileText, comingSoon: true },
  { label: "Collaboration", icon: MessagesSquare, comingSoon: true },
  { label: "Projects", icon: FolderKanban, comingSoon: true },
  { label: "Reports", icon: BarChart3, comingSoon: true },
] as const satisfies readonly NavItem[];

export const superAdminNavigation = [
  { label: "Overview", icon: Shield, to: "/super-admin" },
  { label: "Users", icon: Users, comingSoon: true },
  { label: "Businesses", icon: Briefcase, comingSoon: true },
  { label: "Verifications", icon: Shield, comingSoon: true },
  { label: "Audit logs", icon: FileText, comingSoon: true },
  { label: "Categories", icon: FolderKanban, comingSoon: true },
  { label: "Subscriptions", icon: Wallet, comingSoon: true },
  { label: "Reports", icon: BarChart3, comingSoon: true },
  { label: "Platform settings", icon: LayoutDashboard, comingSoon: true },
] as const satisfies readonly NavItem[];
