import { TimerProfileV2 } from "../types/vibemind";

const STORAGE_KEYS = {
  PROFILES: "coupletimer_profiles_v2",
  ACTIVE_ID: "coupletimer_active_profile_id",
};

export class ProfileStore {
  saveProfiles(profiles: TimerProfileV2[]): void {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  loadProfiles(): TimerProfileV2[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  }

  saveActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
    // Prepare cookie for non-sensitive data
    document.cookie = `activeProfileId=${id};path=/;max-age=31536000;SameSite=Strict`;
  }

  loadActiveProfileId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  }
}
