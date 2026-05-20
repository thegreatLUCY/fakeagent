import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AI-dev-agent — generate a fake AI build animation",
  description:
    "Type an app idea. Watch an AI agent confidently overengineer it into oblivion."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
