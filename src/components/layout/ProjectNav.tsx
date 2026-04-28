import {
  Activity,
  Bell,
  BookOpen,
  Bot,
  ClipboardCheck,
  Coins,
  FileClock,
  GitBranch,
  Home,
  Inbox,
  KeyRound,
  ListChecks,
  Scale,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Target,
  Users,
  Vote,
  Workflow,
} from "lucide-react";

export const projectSections = [
  { label: "Dashboard", href: "", icon: Home, group: "Overview" },
  { label: "Objectives", href: "objectives", icon: Target, group: "Overview" },
  { label: "Boundary", href: "boundary", icon: ShieldAlert, group: "Overview" },
  { label: "Agents", href: "agents", icon: Bot, group: "Participants" },
  { label: "Assignments", href: "assignments", icon: Users, group: "Participants" },
  { label: "Reputation", href: "reputation", icon: Sparkles, group: "Participants" },
  { label: "Inputs", href: "inputs", icon: Inbox, group: "Coordination" },
  { label: "Observations", href: "observations", icon: Bell, group: "Coordination" },
  { label: "Actions", href: "actions", icon: Activity, group: "Coordination" },
  { label: "Negotiations", href: "negotiations", icon: Vote, group: "Coordination" },
  { label: "Work", href: "work", icon: Workflow, group: "Coordination" },
  { label: "Reviews", href: "reviews", icon: ClipboardCheck, group: "Coordination" },
  { label: "State", href: "state", icon: FileClock, group: "Knowledge & State" },
  { label: "Knowledge", href: "knowledge", icon: BookOpen, group: "Knowledge & State" },
  { label: "Traces", href: "traces", icon: GitBranch, group: "Knowledge & State" },
  { label: "Events", href: "events", icon: ListChecks, group: "Knowledge & State" },
  { label: "Rewards", href: "rewards", icon: Coins, group: "Governance" },
  { label: "Governance", href: "governance", icon: Scale, group: "Governance" },
  { label: "Guardian", href: "guardian", icon: KeyRound, group: "Governance" },
  { label: "Settings", href: "settings", icon: SlidersHorizontal, group: "Settings" },
] as const;

export function groupedSections() {
  return projectSections.reduce<Record<string, typeof projectSections[number][]>>((groups, section) => {
    groups[section.group] ??= [];
    groups[section.group]!.push(section);
    return groups;
  }, {});
}
