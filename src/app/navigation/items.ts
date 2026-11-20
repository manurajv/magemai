import {
  BarChart3,
  Briefcase,
  Building2,
  Calendar,
  CalendarCheck,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MessagesSquare,
  Package,
  Settings,
  Shield,
  UserRound,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { roleHas, type BusinessRole } from "@shared/permissions";

export type NavItem =
  | { label: string; icon: LucideIcon; to: string }
  | { label: string; icon: LucideIcon; comingSoon: true };

export const businessNavigation = [
  { label: "Overview", icon: LayoutDashboard, to: "/admin" },
  { label: "Business profile", icon: Building2, to: "/admin/profile" },
  { label: "Settings", icon: Settings, to: "/admin/settings" },
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

export function visibleBusinessNavigation(role: BusinessRole): readonly NavItem[] {
  return businessNavigation.filter((item) => {
    if (!("to" in item)) return true;
    if (item.to === "/admin/profile") return roleHas(role, "business.profile.read");
    if (item.to === "/admin/settings") return roleHas(role, "business.settings.read");
    return true;
  });
}

export const superAdminNavigation = [
  { label: "Overview", icon: Shield, to: "/super-admin" },
  { label: "Users", icon: Users, to: "/super-admin/users" },
  { label: "Businesses", icon: Briefcase, to: "/super-admin/businesses" },
  { label: "Verifications", icon: Shield, to: "/super-admin/verifications" },
  { label: "Audit logs", icon: FileText, to: "/super-admin/audit-logs" },
  { label: "Categories", icon: FolderKanban, comingSoon: true },
  { label: "Subscriptions", icon: Wallet, comingSoon: true },
  { label: "Reports", icon: BarChart3, comingSoon: true },
  { label: "Platform settings", icon: LayoutDashboard, to: "/super-admin/settings" },
] as const satisfies readonly NavItem[];
