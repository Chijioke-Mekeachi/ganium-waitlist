import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ganium Waitlist",
  description: "Join the Ganium waitlist for early access.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}

