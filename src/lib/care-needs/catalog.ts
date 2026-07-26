import {
  Wind,
  AirVent,
  Droplets,
  Activity,
  Gauge,
  Cloud,
  Waves as WavesIcon,
  CircleDot,
  Syringe,
  FlaskConical,
  Utensils,
  Salad,
  CupSoda,
  Zap,
  GitBranch,
  HeartPulse,
  Sparkles,
  Cpu,
  Candy,
  ShieldAlert,
  Hexagon,
  Atom,
  Accessibility,
  PersonStanding,
  Footprints,
  Dumbbell,
  MoveVertical,
  Baby,
  Waves,
  Circle,
  Timer,
  ShowerHead,
  Shirt,
  Smile,
  Hand,
  Moon,
  MessageCircle,
  MoreHorizontal,
  type LucideIcon,
} from "lucide-react";

export type CareNeedCategory =
  | "airways"
  | "feeding"
  | "neurological"
  | "metabolic"
  | "mobility"
  | "continence"
  | "adl"
  | "other";

export interface CareCapability {
  /** Permanent, snake_case. Persisted in `children.care_needs.capabilities`. */
  key: string;
  category: CareNeedCategory;
  icon: LucideIcon;
  /** Reserved for Phase 1b+ — engine-binding metadata, unused in 1a. */
  impliedVitals?: string[];
  impliedModules?: string[];
}

export const CARE_NEED_CATEGORIES: CareNeedCategory[] = [
  "airways",
  "feeding",
  "neurological",
  "metabolic",
  "mobility",
  "continence",
  "adl",
  "other",
];

export const CARE_CAPABILITIES: CareCapability[] = [
  // Airways
  { key: "oxygen", category: "airways", icon: Wind, impliedVitals: ["spo2"], impliedModules: ["oxygen"] },
  { key: "tracheostomy", category: "airways", icon: AirVent, impliedVitals: ["spo2", "breathing"], impliedModules: ["oxygen"] },
  { key: "suctioning", category: "airways", icon: Droplets, impliedVitals: ["spo2"] },
  { key: "ventilator", category: "airways", icon: Activity, impliedVitals: ["spo2", "breathing"], impliedModules: ["oxygen"] },
  { key: "cpap_bipap", category: "airways", icon: Gauge, impliedVitals: ["spo2", "breathing"], impliedModules: ["oxygen"] },
  { key: "inhalations", category: "airways", icon: Cloud, impliedVitals: ["spo2"] },
  { key: "cough_assist", category: "airways", icon: WavesIcon, impliedVitals: ["spo2"] },

  // Feeding
  { key: "g_tube", category: "feeding", icon: CircleDot, impliedVitals: ["weight", "fluids"] },
  { key: "nj_tube", category: "feeding", icon: Syringe, impliedVitals: ["weight", "fluids"] },
  { key: "tpn", category: "feeding", icon: FlaskConical, impliedVitals: ["weight", "fluids"] },
  { key: "oral_feeding_support", category: "feeding", icon: Utensils, impliedVitals: ["weight"] },
  { key: "special_diet", category: "feeding", icon: Salad, impliedVitals: ["weight"] },
  { key: "fluid_tracking", category: "feeding", icon: CupSoda, impliedVitals: ["fluids"] },

  // Neurological
  { key: "seizures", category: "neurological", icon: Zap, impliedVitals: ["seizure"] },
  { key: "vns", category: "neurological", icon: Cpu, impliedVitals: ["seizure"] },
  { key: "shunt", category: "neurological", icon: GitBranch },
  { key: "pain_management", category: "neurological", icon: HeartPulse },
  { key: "sensory_needs", category: "neurological", icon: Sparkles },

  // Metabolic
  { key: "diabetes", category: "metabolic", icon: Candy, impliedVitals: ["glucose"] },
  { key: "adrenal_insufficiency", category: "metabolic", icon: ShieldAlert, impliedVitals: ["temperature"] },
  { key: "thyroid", category: "metabolic", icon: Hexagon, impliedVitals: ["weight"] },
  { key: "metabolic_disorder", category: "metabolic", icon: Atom, impliedVitals: ["weight"] },

  // Mobility
  { key: "wheelchair", category: "mobility", icon: Accessibility },
  { key: "standing_frame", category: "mobility", icon: PersonStanding },
  { key: "orthotics", category: "mobility", icon: Footprints },
  { key: "physio_program", category: "mobility", icon: Dumbbell },
  { key: "transfers_assist", category: "mobility", icon: MoveVertical },

  // Continence
  { key: "diapers", category: "continence", icon: Baby },
  { key: "catheter", category: "continence", icon: Waves },
  { key: "stoma", category: "continence", icon: Circle },
  { key: "bowel_program", category: "continence", icon: Timer },

  // ADL
  { key: "bathing_assist", category: "adl", icon: ShowerHead },
  { key: "dressing_assist", category: "adl", icon: Shirt },
  { key: "oral_care", category: "adl", icon: Smile },
  { key: "skin_care", category: "adl", icon: Hand },
  { key: "sleep_positioning", category: "adl", icon: Moon },
  { key: "communication_aac", category: "adl", icon: MessageCircle },

  // Other
  { key: "other", category: "other", icon: MoreHorizontal },
];


export function capabilitiesByCategory(category: CareNeedCategory): CareCapability[] {
  return CARE_CAPABILITIES.filter((c) => c.category === category);
}

export function findCapability(key: string): CareCapability | undefined {
  return CARE_CAPABILITIES.find((c) => c.key === key);
}
