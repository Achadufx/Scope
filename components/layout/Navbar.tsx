"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import ConnectWallet from "@/components/wallet/ConnectWallet";
import {
  ShieldAlert,
  Sliders,
  Terminal,
  Activity,
  Zap,
  Layers,
  Code2,
  FileCode2,
  Settings as SettingsIcon,
  Bot,
  ExternalLink,
} from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  const navItems = [
    { name: "Command Center", href: "/dashboard", icon: Activity },
    { name: "Attack Lab", href: "/attack-lab", icon: ShieldAlert, badge: "Live Demo" },
    { name: "Policies", href: "/policies", icon: Sliders },
    { name: "Simulator", href: "/simulator", icon: Zap },
    { name: "Agents", href: "/agents", icon: Bot },
    { name: "Evidence Vault", href: "/executions", icon: Layers },
    { name: "Contracts", href: "/contracts", icon: FileCode2 },
    { name: "API", href: "/developer", icon: Code2 },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-surface font-mono font-bold text-sm tracking-wider group-hover:bg-accent transition-colors">
              SC
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-bold text-primary tracking-tight text-base font-sans">SCOPE</span>
                <span className="rounded bg-accent-light px-1.5 py-0.5 text-[10px] font-semibold text-accent uppercase tracking-wide">
                  Firewall
                </span>
              </div>
              <span className="text-[11px] text-secondary font-medium -mt-0.5">Execution Envelopes for Agents</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 ml-4">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-primary text-surface"
                      : "text-secondary hover:text-primary hover:bg-background"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{item.name}</span>
                  {item.badge && !isActive && (
                    <span className="rounded-full bg-danger-surface px-1.5 py-0.5 text-[9px] font-semibold text-danger border border-danger-border">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Status & Controls */}
        <div className="flex items-center gap-3">
          {/* Status pill */}
          <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full border border-success-border bg-success-surface text-success text-[11px] font-medium font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            <span>ENFORCING ONCHAIN</span>
          </div>

          <Link
            href="/attack-lab"
            className="hidden sm:flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-surface shadow-sm hover:bg-accent-hover transition-colors"
          >
            <ShieldAlert className="h-3.5 w-3.5" />
            <span>Launch Attack</span>
          </Link>

          <ConnectWallet />

          <Link
            href="/settings"
            className="p-1.5 text-secondary hover:text-primary rounded-md hover:bg-background transition-colors"
            title="Settings"
          >
            <SettingsIcon className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Sub-nav for mobile */}
      <div className="lg:hidden flex items-center overflow-x-auto border-t border-border px-4 py-2 gap-2 bg-surface">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/" && pathname?.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 rounded text-xs font-medium ${
                isActive ? "bg-primary text-surface" : "text-secondary hover:text-primary bg-background"
              }`}
            >
              <Icon className="h-3 w-3" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </header>
  );
}
