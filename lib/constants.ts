import {
  BookOpenText,
  Calculator,
  HeartHandshake,
  Leaf,
  Palette,
  PersonStanding,
  Sparkles,
} from "lucide-react";

export const DEVELOPMENT_AREAS = [
  { key: "language", label: "Хэл яриа", short: "Хэл", color: "#f97386", bg: "#fff0f3", icon: BookOpenText },
  { key: "numeracy", label: "Тоо тоолол", short: "Тоо", color: "#8b5cf6", bg: "#f4f0ff", icon: Calculator },
  { key: "movement", label: "Хөдөлгөөн, эрүүл мэнд", short: "Хөдөлгөөн", color: "#0ea5e9", bg: "#eaf8ff", icon: PersonStanding },
  { key: "social", label: "Нийгэм, сэтгэл хөдлөл", short: "Нийгэм", color: "#f59e0b", bg: "#fff7e6", icon: HeartHandshake },
  { key: "art", label: "Зураг, урлал", short: "Урлал", color: "#ec4899", bg: "#fff0f8", icon: Palette },
  { key: "development", label: "Ерөнхий хөгжил", short: "Хөгжил", color: "#14b8a6", bg: "#e9fbf8", icon: Sparkles },
  { key: "environment", label: "Байгаль, нийгмийн орчин", short: "Орчин", color: "#65a30d", bg: "#f2f9e8", icon: Leaf },
] as const;

export const GROUP_COLORS = ["#f97386", "#8b5cf6", "#0ea5e9", "#f59e0b", "#14b8a6", "#65a30d"];

export function childName(child?: { first_name: string; last_name: string | null; preferred_name: string | null }) {
  if (!child) return "—";
  return child.preferred_name || [child.last_name, child.first_name].filter(Boolean).join(" ");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("mn-MN", { year: "numeric", month: "short", day: "numeric" }).format(new Date(`${value}T00:00:00`));
}
