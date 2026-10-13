"use client";

import { useState, type ReactNode } from "react";
import { Sidebar } from "@/components/layout/sidebar";

export function MainShell({
  children,
  userName,
  isAdmin,
  role,
  actionNeededCount,
  openIssueCount,
  pendingUserCount,
}: {
  children: ReactNode;
  userName: string;
  isAdmin: boolean;
  role: "ADMIN" | "USER";
  actionNeededCount: number;
  openIssueCount: number;
  pendingUserCount: number;
}) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen">
      <Sidebar
        userName={userName}
        isAdmin={isAdmin}
        role={role}
        actionNeededCount={actionNeededCount}
        openIssueCount={openIssueCount}
        pendingUserCount={pendingUserCount}
        collapsed={collapsed}
        onToggleCollapsed={() => setCollapsed((current) => !current)}
      />
      <main className={collapsed ? "lg:pl-20" : "lg:pl-64"}>
        <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </div>
  );
}
