import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Man in the Mirror Strategy | Leveraged ETF Decay Dashboard",
  description: "Real-time monitoring dashboard for leveraged ETF decay trading strategy. Track VIX, TQQQ, SQQQ, and optimize entry timing.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:bg-white focus:p-4 focus:rounded focus:shadow-lg"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  );
}
