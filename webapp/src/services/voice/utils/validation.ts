import { DEFAULT_VOICE_SETTINGS } from "../constants/defaults";
import type {
  VoiceCategory,
  VoiceEra,
  VoiceSettings,
  VoiceStyle,
} from "../types";

export function validateVoiceSettings(
  settings: Partial<VoiceSettings> = {},
): VoiceSettings {
  const result: VoiceSettings = { ...DEFAULT_VOICE_SETTINGS };

  // Validate and apply each setting
  Object.entries(settings).forEach(([key, value]) => {
    if (value !== undefined && key in result) {
      (result as any)[key] = value;
    }
  });

  return result;
}

export function validateVoiceStyle(
  style: Partial<VoiceStyle>,
): VoiceStyle | null {
  if (
    !style.id ||
    !style.name ||
    !style.category ||
    !style.era ||
    !style.settings
  ) {
    return null;
  }

  return {
    id: style.id,
    name: style.name,
    description: style.description || "",
    category: style.category as VoiceCategory,
    era: style.era as VoiceEra,
    tags: Array.isArray(style.tags) ? style.tags : [],
    settings: validateVoiceSettings(style.settings),
    isActive: Boolean(style.isActive),
    isCustom: Boolean(style.isCustom),
    accent: style.accent,
  };
}

export function isVoiceCategory(value: unknown): value is VoiceCategory {
  const categories: VoiceCategory[] = [
    "dramatic",
    "elegant",
    "sultry",
    "commanding",
    "playful",
    "character",
    "soothing",
  ];
  return (
    typeof value === "string" && categories.includes(value as VoiceCategory)
  );
}

export function isVoiceEra(value: unknown): value is VoiceEra {
  const eras: VoiceEra[] = ["classic", "modern", "vintage", "timeless"];
  return typeof value === "string" && eras.includes(value as VoiceEra);
}
