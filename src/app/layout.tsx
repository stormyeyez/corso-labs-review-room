import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Corso Labs: ED Documentation Review Room",
  description: "Gemma 4 on Cerebras multi-agent ED documentation QA demo.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
