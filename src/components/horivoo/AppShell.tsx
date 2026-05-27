"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthForm } from "./AuthForm";
import { TeacherPanel } from "./TeacherPanel";
import { StudentPanel } from "./StudentPanel";
import { CoordinatorPanel } from "./CoordinatorPanel";
import { PWARegister } from "./PWARegister";
import { useStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import type { Tab, UserProfile } from "@/lib/types";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  GraduationCap,
  ClipboardList,
  LogOut,
  LogIn,
  Calendar,
} from "lucide-react";

export function AppShell() {
  const {
    profile,
    isGuest,
    tab,
    setProfile,
    setIsGuest,
    setTab,
    setTeacherId,
    setTeacherName,
    setCoordinatorId,
    setCoordinatorName,
    logout,
  } = useStore();

  const [initialized, setInitialized] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const supabase = createClient();

  // Check auth on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          // Check if coordinator
          const coordRes = await fetch(
            `/api/coordinators?user_id=${user.id}`
          );
          const coordData = await coordRes.json();

          if (coordData && coordData.id) {
            setProfile({
              id: user.id,
              name: coordData.name || user.user_metadata?.name || user.email || "",
              email: user.email || "",
              role: "coordinator",
            });
            setCoordinatorId(coordData.id);
            setCoordinatorName(coordData.name);
            setTab("coordinator");
          } else {
            // Must be a teacher
            const teacherRes = await fetch(
              `/api/teachers?user_id=${user.id}`
            );
            // The /api/teachers returns an array, /api/teachers/[id] returns single
            // Let's try the specific endpoint
            let teacherData = null;
            try {
              const specificRes = await fetch(`/api/teachers/${user.id}`);
              if (specificRes.ok) {
                teacherData = await specificRes.json();
              }
            } catch {
              // Try fallback
            }

            // If teacher not found, try to find in list
            if (!teacherData || !teacherData.id) {
              try {
                const allRes = await fetch("/api/teachers");
                const allTeachers = await allRes.json();
                if (Array.isArray(allTeachers)) {
                  teacherData = allTeachers.find(
                    (t: { user_id: string | null }) => t.user_id === user.id
                  );
                }
              } catch {
                // skip
              }
            }

            if (teacherData && teacherData.id) {
              setProfile({
                id: user.id,
                name: teacherData.name || user.user_metadata?.name || user.email || "",
                email: user.email || "",
                role: "teacher",
              });
              setTeacherId(teacherData.id);
              setTeacherName(teacherData.name);
              setTab("teacher");
            } else {
              // Teacher profile not found - might need recreation
              setProfile({
                id: user.id,
                name: user.user_metadata?.name || user.email?.split("@")[0] || "",
                email: user.email || "",
                role: "teacher",
              });
              setTab("teacher");
              toast.error("Perfil não encontrado. Tente fazer login novamente.");
            }
          }
        } else {
          // Check guest mode
          const guestStored = localStorage.getItem("horivoo_guest");
          if (guestStored === "true") {
            setIsGuest(true);
            setTab("student");
          } else {
            setShowAuth(true);
          }
        }
      } catch {
        setShowAuth(true);
      } finally {
        setInitialized(true);
      }
    };

    checkAuth();
  }, [supabase, setProfile, setIsGuest, setTab, setTeacherId, setTeacherName, setCoordinatorId, setCoordinatorName]);

  const handleAuthSuccess = useCallback(() => {
    // Reload to re-check auth
    window.location.reload();
  }, []);

  const handleGuestMode = useCallback(() => {
    localStorage.setItem("horivoo_guest", "true");
    setIsGuest(true);
    setTab("student");
    setShowAuth(false);
  }, [setIsGuest, setTab]);

  const handleLogout = useCallback(async () => {
    if (!confirm("Deseja sair da sua conta?")) return;
    try {
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    localStorage.removeItem("horivoo_guest");
    logout();
    toast.success("Você saiu da conta.");
    setTimeout(() => window.location.reload(), 300);
  }, [supabase, logout]);

  const handleLoginFromHeader = useCallback(() => {
    localStorage.removeItem("horivoo_guest");
    setIsGuest(false);
    setShowAuth(true);
  }, [setIsGuest]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-3">
          <Calendar className="h-10 w-10 text-primary animate-pulse" />
          <p className="text-muted-foreground">Carregando Horivoo...</p>
        </div>
      </div>
    );
  }

  if (showAuth) {
    return (
      <>
        <PWARegister />
        <AuthForm
          onAuthSuccess={handleAuthSuccess}
          onGuestMode={handleGuestMode}
        />
      </>
    );
  }

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: "teacher", label: "Professor", icon: <BookOpen className="h-4 w-4" /> },
    { key: "student", label: "Aluno", icon: <GraduationCap className="h-4 w-4" /> },
    { key: "coordinator", label: "Coordenador", icon: <ClipboardList className="h-4 w-4" /> },
  ];

  // Hide teacher tab for guests
  const visibleTabs = isGuest
    ? tabs.filter((t) => t.key === "student")
    : tabs;

  // Only show coordinator tab for coordinators
  const displayTabs = profile?.role !== "coordinator" && !isGuest
    ? visibleTabs.filter((t) => t.key !== "coordinator")
    : visibleTabs;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PWARegister />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-card border-b shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-primary" />
            <h1 className="text-lg font-bold text-primary">Horivoo</h1>
          </div>

          {/* Tab navigation */}
          <nav className="flex gap-1">
            {displayTabs.map((t) => (
              <Button
                key={t.key}
                variant={tab === t.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setTab(t.key)}
                className="gap-1.5"
              >
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </Button>
            ))}
          </nav>

          {/* User info */}
          <div className="flex items-center gap-2">
            {profile ? (
              <>
                <span className="text-sm text-muted-foreground hidden sm:inline truncate max-w-32">
                  {profile.name}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  className="gap-1"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sair</span>
                </Button>
              </>
            ) : isGuest ? (
              <>
                <span className="text-sm text-muted-foreground">Aluno</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLoginFromHeader}
                  className="gap-1"
                >
                  <LogIn className="h-4 w-4" />
                  <span className="hidden sm:inline">Entrar</span>
                </Button>
              </>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">
        {tab === "teacher" && <TeacherPanel />}
        {tab === "student" && <StudentPanel />}
        {tab === "coordinator" && <CoordinatorPanel />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t bg-card py-3 text-center text-xs text-muted-foreground">
        Horivoo — Agenda de Professores
      </footer>
    </div>
  );
}
