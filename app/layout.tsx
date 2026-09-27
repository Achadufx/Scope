import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "SCOPE — The Execution Firewall for Autonomous Agents",
  description:
    "SCOPE turns economic policies into onchain execution boundaries for autonomous agents. Enforces pre-conditions and post-conditions with atomic smart contract reverts.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col bg-background text-primary antialiased selection:bg-accent-light selection:text-accent">
        <Providers>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
          <footer className="border-t border-border bg-surface py-6 text-center text-xs text-secondary">
            <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary">SCOPE</span>
                <span>— The Execution Firewall for Autonomous Agents</span>
              </div>
              <div className="flex items-center gap-6">
                <span className="font-mono text-[11px] text-secondary">EIP-712 Typed Structured Envelopes</span>
                <span className="font-mono text-[11px] text-success">Atomic Postcondition Verification</span>
              </div>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}
