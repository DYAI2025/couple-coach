import { TimerProfileV2 } from "../types/vibemind";

const STORAGE_KEYS = {
  PROFILES: "coupletimer_profiles_v2",
  ACTIVE_ID: "coupletimer_active_profile_id",
  OLD_PROFILES: "zwiegespraech_profiles",
  OLD_ACTIVE_ID: "zwiegespraech_selected_profile_id"
};

export class ProfileStore {
  constructor() {
    this.migrate();
  }

  private migrate() {
    const oldProfiles = localStorage.getItem(STORAGE_KEYS.OLD_PROFILES);
    if (oldProfiles && !localStorage.getItem(STORAGE_KEYS.PROFILES)) {
      localStorage.setItem(STORAGE_KEYS.PROFILES, oldProfiles);
      localStorage.removeItem(STORAGE_KEYS.OLD_PROFILES);
    }
    const oldActiveId = localStorage.getItem(STORAGE_KEYS.OLD_ACTIVE_ID);
    if (oldActiveId && !localStorage.getItem(STORAGE_KEYS.ACTIVE_ID)) {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, oldActiveId);
      localStorage.removeItem(STORAGE_KEYS.OLD_ACTIVE_ID);
    }
  }

  saveProfiles(profiles: TimerProfileV2[]): void {
    localStorage.setItem(STORAGE_KEYS.PROFILES, JSON.stringify(profiles));
  }

  loadProfiles(): TimerProfileV2[] {
    const data = localStorage.getItem(STORAGE_KEYS.PROFILES);
    return data ? JSON.parse(data) : [];
  }

  saveActiveProfileId(id: string): void {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_ID, id);
  }

  loadActiveProfileId(): string | null {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_ID);
  }
}
