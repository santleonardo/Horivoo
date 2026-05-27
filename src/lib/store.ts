import { create } from "zustand";
import type { Tab, UserProfile } from "./types";

interface AppState {
  profile: UserProfile | null;
  isGuest: boolean;
  tab: Tab;
  teacherId: string | null;
  teacherName: string | null;
  coordinatorId: string | null;
  coordinatorName: string | null;
  setProfile: (profile: UserProfile | null) => void;
  setIsGuest: (isGuest: boolean) => void;
  setTab: (tab: Tab) => void;
  setTeacherId: (id: string | null) => void;
  setTeacherName: (name: string | null) => void;
  setCoordinatorId: (id: string | null) => void;
  setCoordinatorName: (name: string | null) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  profile: null,
  isGuest: false,
  tab: "teacher",
  teacherId: null,
  teacherName: null,
  coordinatorId: null,
  coordinatorName: null,

  setProfile: (profile) => set({ profile }),
  setIsGuest: (isGuest) => set({ isGuest }),
  setTab: (tab) => set({ tab }),
  setTeacherId: (teacherId) => set({ teacherId }),
  setTeacherName: (teacherName) => set({ teacherName }),
  setCoordinatorId: (coordinatorId) => set({ coordinatorId }),
  setCoordinatorName: (coordinatorName) => set({ coordinatorName }),
  logout: () =>
    set({
      profile: null,
      isGuest: false,
      tab: "teacher",
      teacherId: null,
      teacherName: null,
      coordinatorId: null,
      coordinatorName: null,
    }),
}));
