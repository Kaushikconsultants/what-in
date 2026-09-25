"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Gem,
  Sun,
  Moon,
  ExternalLink,
  LogOut,
  Crown,
  Sparkles,
  ShieldCheck,
  Users
} from "lucide-react";

export default function OwnerHeaderNav() {
  const pathname = usePathname();
  if (pathname === "/owner/login") return null;
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedTheme = localStorage.getItem("wm_theme");
      if (savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)) {
        setIsDarkMode(true);
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
      }
    } catch (_) {}
  }, []);

  const toggleDarkMode = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      if (nextMode) {
        document.documentElement.classList.add("dark");
        document.documentElement.setAttribute("data-theme", "dark");
        localStorage.setItem("wm_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        document.documentElement.setAttribute("data-theme", "light");
        localStorage.setItem("wm_theme", "light");
      }
    } catch (_) {}
  };

  const handleLogout = async () => {
    sessionStorage.removeItem("owner_authed");
    await fetch("/api/owner/auth", { method: "DELETE" });
    router.push("/owner/login");
  };

  const navItems = [
    { label: "Dashboard", href: "/owner", icon: LayoutDashboard, exact: true },
    { label: "Clients & Modules", href: "/owner/clients", icon: Building2, exact: false },
    { label: "Inbound Leads", href: "/owner/leads", icon: Users, exact: false },
    { label: "Announcements", href: "/owner/announcements", icon: Megaphone, exact: false },
    { label: "Plans & Matrix", href: "/owner/plans", icon: Gem, exact: false },
  ];

  const isNavActive = (href: string, exact: boolean) => {
    if (exact) return pathname === href;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl transition-colors duration-200">
      <div className="w-full px-4 sm:px-6 lg:px-10">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Brand & Console Title */}
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/owner" className="flex items-center gap-3 group focus:outline-none">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-200">
                <Crown size={20} className="text-amber-300 drop-shadow-xs" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                    What-In
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800/60 uppercase tracking-wider">
                    <ShieldCheck size={11} className="text-emerald-500" /> Super-Admin
                  </span>
                </div>
                <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400 m-0">
                  Multi-Tenant Operations & Feature Gating
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isNavActive(item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all duration-150 flex items-center gap-2 ${
                    active
                      ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 shadow-xs border border-indigo-200/60 dark:border-indigo-800/60"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/60 border border-transparent"
                  }`}
                >
                  <Icon size={15} className={active ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2">
            {/* Theme Toggle Button */}
            {isMounted && (
              <button
                onClick={toggleDarkMode}
                aria-label="Toggle Theme"
                title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/70 transition-all cursor-pointer shadow-2xs"
              >
                {isDarkMode ? (
                  <Sun size={17} className="text-amber-400 hover:rotate-45 transition-transform" />
                ) : (
                  <Moon size={17} className="text-slate-700 hover:-rotate-12 transition-transform" />
                )}
              </button>
            )}

            {/* Jump to Client Portal */}
            <Link
              href="/whatsapp/dashboard"
              target="_blank"
              title="Open Client Portal"
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700/80 border border-slate-200/70 dark:border-slate-700/70 transition-all shadow-2xs"
            >
              <span>Client App</span>
              <ExternalLink size={13} className="text-slate-400" />
            </Link>

            {/* Sign Out Button */}
            <button
              onClick={handleLogout}
              title="Sign Out of Owner Console"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200/80 dark:border-rose-800/60 transition-all cursor-pointer shadow-2xs"
            >
              <LogOut size={13} />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

        </div>

        {/* Mobile Nav strip */}
        <div className="flex md:hidden items-center gap-1 py-2 overflow-x-auto border-t border-slate-100 dark:border-slate-800/60 no-scrollbar">
          {navItems.map((item) => {
            const active = isNavActive(item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap flex items-center gap-1.5 ${
                  active
                    ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                }`}
              >
                <Icon size={13} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

      </div>
    </header>
  );
}
