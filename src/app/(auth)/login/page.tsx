"use client";

import { useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandPanel } from "@/components/auth/brand-panel";
import { IdCard, Lock, AlertCircle, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const router = useRouter();
  const [employeeId, setEmployeeId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Sent here by the app after an admin suspended this account mid-session: drop the stale session.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("suspended") === "1") {
      setError("บัญชีของคุณถูกระงับการใช้งาน กรุณาติดต่อผู้ดูแลระบบ");
      signOut({ redirect: false });
    }
  }, []);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      employeeId,
      password,
      redirect: false,
    });

    if (result?.error) {
      setLoading(false);
      setError("ตรวจสอบรหัสพนักงานและรหัสผ่าน หรือบัญชีของคุณอาจยังรออนุมัติ");
      return;
    }

    // Stay in the busy state until the dashboard replaces this page.
    setSuccess(true);
    router.replace("/");
  }

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      {/* Form panel */}
      <div className="flex w-full flex-col items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo size={40} tagline="ระบบยืมอุปกรณ์ IT" />
          </div>

          <h2 className="text-2xl font-bold tracking-tight">เข้าสู่ระบบ</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            กรอกรหัสพนักงานและรหัสผ่านเพื่อเข้าใช้งานระบบยืมอุปกรณ์ IT
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employeeId">รหัสพนักงาน</Label>
              <div className="relative">
                <IdCard className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="employeeId"
                  name="employeeId"
                  type="text"
                  placeholder="รหัสพนักงาน"
                  value={employeeId}
                  onChange={(e) => setEmployeeId(e.target.value)}
                  className="pl-10"
                  autoComplete="username"
                  required
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">รหัสผ่าน</Label>
              <div className="relative">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="รหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-11"
                  autoComplete="current-password"
                  required
                />
                {/* Shows the password only while held, so it never stays visible on screen. */}
                <button
                  type="button"
                  aria-label="กดค้างเพื่อแสดงรหัสผ่าน"
                  title="กดค้างเพื่อแสดงรหัสผ่าน"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    setShowPassword(true);
                  }}
                  onPointerUp={() => setShowPassword(false)}
                  onPointerLeave={() => setShowPassword(false)}
                  onPointerCancel={() => setShowPassword(false)}
                  onKeyDown={(e) => {
                    if (e.key === " " || e.key === "Enter") {
                      e.preventDefault();
                      setShowPassword(true);
                    }
                  }}
                  onKeyUp={() => setShowPassword(false)}
                  onBlur={() => setShowPassword(false)}
                  onContextMenu={(e) => e.preventDefault()}
                  className="absolute right-1.5 top-1/2 flex h-8 w-8 -translate-y-1/2 touch-none select-none items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className={cn("mt-1 w-full gap-2", success && "bg-emerald-600 hover:bg-emerald-600 disabled:opacity-100")}
            >
              {success ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  สำเร็จ กำลังเปิดหน้าหลัก...
                </>
              ) : loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                "เข้าสู่ระบบ"
              )}
            </Button>
          </form>

          <p className="mt-5 text-center text-sm text-muted-foreground">
            ยังไม่มีบัญชี?{" "}
            <Link href="/register" className="font-medium text-primary hover:underline">
              สมัครใช้งานด้วยรหัสพนักงาน
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
