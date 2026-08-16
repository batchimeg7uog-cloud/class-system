import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Өсөлт — Хүүхдийн хөгжлийн систем",
  description: "Цэцэрлэгийн багшийн өдөр тутмын ажиглалт, ахицын анализ, тайлангийн систем.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="mn">
      <body>{children}</body>
    </html>
  );
}
