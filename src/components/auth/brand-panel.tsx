"use client";

import { useEffect, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  Headphones,
  Laptop,
  Monitor,
  Mouse,
  Projector,
  RotateCcw,
  ShieldCheck,
  Tablet,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo, LogoMark } from "@/components/brand/logo";

const highlights = [
  { icon: Laptop, text: "ติดตามอุปกรณ์ IT ทั้งหมดได้แบบเรียลไทม์" },
  { icon: ClipboardCheck, text: "ขอยืม-คืน และอนุมัติได้ง่ายในไม่กี่คลิก" },
  { icon: ShieldCheck, text: "ควบคุมสิทธิ์การเข้าถึงตามบทบาทผู้ใช้งาน" },
];

const outerOrbit: LucideIcon[] = [Laptop, Monitor, Tablet, Camera, Projector];
const innerOrbit: LucideIcon[] = [Headphones, Mouse, Laptop];

const events = [
  { icon: CheckCircle2, tone: "bg-emerald-400/20 text-emerald-200", title: "อนุมัติคำขอแล้ว", detail: "MacBook Air M2 · 1 ชิ้น" },
  { icon: Clock, tone: "bg-amber-400/20 text-amber-200", title: "คำขอใหม่รออนุมัติ", detail: "Projector · ห้องประชุม 3" },
  { icon: RotateCcw, tone: "bg-sky-400/20 text-sky-200", title: "รับคืนอุปกรณ์แล้ว", detail: "Monitor LG 24 inch · 2 ชิ้น" },
];

function Orbit({
  icons,
  size,
  duration,
  reverse = false,
}: {
  icons: LucideIcon[];
  size: number;
  duration: number;
  reverse?: boolean;
}) {
  const spin = `spin ${duration}s linear infinite${reverse ? " reverse" : ""}`;
  const counterSpin = `spin ${duration}s linear infinite${reverse ? "" : " reverse"}`;

  return (
    <div
      className="absolute left-1/2 top-1/2 rounded-full border border-white/15 motion-safe:[animation:var(--orbit-spin)]"
      style={{
        width: size,
        height: size,
        marginLeft: -size / 2,
        marginTop: -size / 2,
        ["--orbit-spin" as string]: spin,
      }}
    >
      {icons.map((Icon, index) => {
        const angle = (index / icons.length) * Math.PI * 2;
        return (
          <div
            key={index}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            // Rounded so server and client render identical styles (avoids a hydration mismatch).
            style={{ left: `${(50 + 50 * Math.cos(angle)).toFixed(3)}%`, top: `${(50 + 50 * Math.sin(angle)).toFixed(3)}%` }}
          >
            <span
              className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 shadow-lg shadow-indigo-900/20 ring-1 ring-inset ring-white/25 backdrop-blur-md motion-safe:[animation:var(--orbit-counter)]"
              style={{ ["--orbit-counter" as string]: counterSpin }}
            >
              <Icon className="h-5 w-5" />
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function BrandPanel() {
  const [eventIndex, setEventIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setEventIndex((index) => (index + 1) % events.length), 3200);
    return () => window.clearInterval(timer);
  }, []);

  const event = events[eventIndex];

  return (
    <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-700 p-12 text-white lg:flex">
      {/* Background: drifting glows + slowly panning dot grid */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-fuchsia-400/30 blur-3xl motion-safe:animate-drift" />
      <div
        className="pointer-events-none absolute -bottom-32 right-0 h-[28rem] w-[28rem] rounded-full bg-sky-400/25 blur-3xl motion-safe:animate-drift"
        style={{ animationDelay: "-6s", animationDuration: "22s" }}
      />
      <div
        className="pointer-events-none absolute left-1/3 top-1/2 h-72 w-72 rounded-full bg-violet-300/20 blur-3xl motion-safe:animate-drift"
        style={{ animationDelay: "-12s", animationDuration: "26s" }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08] motion-safe:animate-dot-pan"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="relative motion-safe:animate-rise-in">
        <Logo size={40} variant="light" tagline="ระบบยืมอุปกรณ์ IT" />
      </div>

      <div className="relative flex flex-col gap-10">
        {/* Orbiting equipment around the logo */}
        <div className="relative mx-auto h-72 w-72 motion-safe:animate-rise-in" style={{ animationDelay: "120ms" }}>
          <Orbit icons={outerOrbit} size={288} duration={48} />
          <Orbit icons={innerOrbit} size={168} duration={32} reverse />

          <div className="absolute left-1/2 top-1/2 -ml-10 -mt-10 h-20 w-20">
            <span className="absolute inset-0 rounded-2xl bg-white/40 blur-xl motion-safe:animate-glow-pulse" />
            <LogoMark size={80} variant="light" className="relative shadow-2xl shadow-indigo-900/40" />
          </div>

          {/* Live-looking activity toast */}
          <div className="absolute -bottom-8 -right-48 z-10 w-56 motion-safe:animate-float" style={{ animationDelay: "-2s" }}>
            <div
              key={eventIndex}
              className="flex items-center gap-3 rounded-xl bg-white/15 p-3 shadow-xl shadow-indigo-950/20 ring-1 ring-inset ring-white/25 backdrop-blur-md motion-safe:animate-rise-in"
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", event.tone)}>
                <event.icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{event.title}</p>
                <p className="truncate text-xs text-indigo-100">{event.detail}</p>
              </div>
            </div>
          </div>

          <div className="absolute -left-40 -top-2 z-10 motion-safe:animate-float" style={{ animationDelay: "-4s" }}>
            <div className="flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium ring-1 ring-inset ring-white/25 backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
              ระบบพร้อมใช้งาน
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <h1
            className="max-w-md text-3xl font-bold leading-tight text-balance motion-safe:animate-rise-in"
            style={{ animationDelay: "220ms" }}
          >
            จัดการการยืม-คืนอุปกรณ์ IT ขององค์กรอย่างเป็นระบบ
          </h1>
          <ul className="flex flex-col gap-4">
            {highlights.map((item, index) => (
              <li
                key={item.text}
                className="flex items-center gap-3 text-sm text-indigo-100 motion-safe:animate-rise-in"
                style={{ animationDelay: `${340 + index * 110}ms` }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur">
                  <item.icon className="h-4 w-4" />
                </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="relative text-xs text-indigo-200">© {new Date().getFullYear()} LendIT — ระบบยืมอุปกรณ์ IT ภายในองค์กร</p>
    </div>
  );
}
