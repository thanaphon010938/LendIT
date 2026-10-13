import {
  Cable,
  HardDrive,
  Headphones,
  Keyboard,
  Laptop,
  Mic,
  Monitor,
  Mouse,
  Package,
  Printer,
  Projector,
  Router,
  Smartphone,
  Speaker,
  Tablet,
  Webcam,
  type LucideIcon,
} from "lucide-react";

type Kind =
  | "laptop"
  | "monitor"
  | "camera"
  | "projector"
  | "tablet"
  | "keyboard"
  | "mouse"
  | "headphones"
  | "printer"
  | "router"
  | "phone"
  | "speaker"
  | "storage"
  | "cable"
  | "mic";

// Matched in order against the lower-cased category name (English or Thai).
const kinds: { kind: Kind; keywords: string[] }[] = [
  { kind: "laptop", keywords: ["notebook", "laptop", "macbook", "โน้ตบุ๊ก", "โน๊ตบุ๊ค", "แล็ปท็อป"] },
  { kind: "tablet", keywords: ["tablet", "ipad", "แท็บเล็ต", "แทปเลต"] },
  { kind: "monitor", keywords: ["monitor", "display", "screen", "จอ"] },
  { kind: "projector", keywords: ["projector", "โปรเจคเตอร์", "โปรเจกเตอร์"] },
  { kind: "camera", keywords: ["camera", "webcam", "กล้อง"] },
  { kind: "keyboard", keywords: ["keyboard", "accessory", "คีย์บอร์ด"] },
  { kind: "mouse", keywords: ["mouse", "เมาส์"] },
  { kind: "headphones", keywords: ["headphone", "headset", "หูฟัง"] },
  { kind: "printer", keywords: ["printer", "เครื่องพิมพ์", "ปริ้นเตอร์"] },
  { kind: "router", keywords: ["router", "network", "wifi", "เราเตอร์"] },
  { kind: "phone", keywords: ["phone", "mobile", "โทรศัพท์", "มือถือ"] },
  { kind: "speaker", keywords: ["speaker", "ลำโพง"] },
  { kind: "storage", keywords: ["storage", "drive", "harddisk", "ssd", "ฮาร์ดดิสก์"] },
  { kind: "cable", keywords: ["cable", "adapter", "สาย", "อะแดปเตอร์"] },
  { kind: "mic", keywords: ["mic", "microphone", "ไมค์"] },
];

const icons: Record<Kind, LucideIcon> = {
  laptop: Laptop,
  monitor: Monitor,
  camera: Webcam,
  projector: Projector,
  tablet: Tablet,
  keyboard: Keyboard,
  mouse: Mouse,
  headphones: Headphones,
  printer: Printer,
  router: Router,
  phone: Smartphone,
  speaker: Speaker,
  storage: HardDrive,
  cable: Cable,
  mic: Mic,
};

// Full literal class strings so Tailwind generates them.
const tile = {
  indigo: "bg-gradient-to-br from-indigo-50 to-indigo-100 text-indigo-600 ring-1 ring-inset ring-indigo-200/70",
  sky: "bg-gradient-to-br from-sky-50 to-sky-100 text-sky-600 ring-1 ring-inset ring-sky-200/70",
  rose: "bg-gradient-to-br from-rose-50 to-rose-100 text-rose-600 ring-1 ring-inset ring-rose-200/70",
  amber: "bg-gradient-to-br from-amber-50 to-amber-100 text-amber-600 ring-1 ring-inset ring-amber-200/70",
  violet: "bg-gradient-to-br from-violet-50 to-violet-100 text-violet-600 ring-1 ring-inset ring-violet-200/70",
  emerald: "bg-gradient-to-br from-emerald-50 to-emerald-100 text-emerald-600 ring-1 ring-inset ring-emerald-200/70",
  teal: "bg-gradient-to-br from-teal-50 to-teal-100 text-teal-600 ring-1 ring-inset ring-teal-200/70",
  fuchsia: "bg-gradient-to-br from-fuchsia-50 to-fuchsia-100 text-fuchsia-600 ring-1 ring-inset ring-fuchsia-200/70",
  slate: "bg-gradient-to-br from-slate-50 to-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200/70",
} as const;

const kindColor: Record<Kind, keyof typeof tile> = {
  laptop: "indigo",
  monitor: "sky",
  camera: "rose",
  projector: "amber",
  tablet: "violet",
  keyboard: "teal",
  mouse: "emerald",
  headphones: "fuchsia",
  printer: "slate",
  router: "sky",
  phone: "violet",
  speaker: "amber",
  storage: "slate",
  cable: "teal",
  mic: "rose",
};

// Unknown categories get a stable color from this list.
const fallbackColors: (keyof typeof tile)[] = ["indigo", "sky", "violet", "emerald", "amber", "rose", "teal", "fuchsia"];

function normalizeCategoryName(category: string | { name?: string } | null | undefined): string {
  if (typeof category === "string") return category.trim();
  if (category && typeof category === "object" && typeof category.name === "string") return category.name.trim();
  return "";
}

function kindOf(name: string): Kind | null {
  const lower = name.toLowerCase();
  return kinds.find(({ keywords }) => keywords.some((keyword) => lower.includes(keyword)))?.kind ?? null;
}

export function getEquipmentIcon(category: string | { name?: string } | null | undefined): LucideIcon {
  const kind = kindOf(normalizeCategoryName(category));
  return kind ? icons[kind] : Package;
}

export function getCategoryColor(category: string | { name?: string } | null | undefined): string {
  const name = normalizeCategoryName(category);
  const kind = kindOf(name);
  if (kind) return tile[kindColor[kind]];

  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return tile[fallbackColors[Math.abs(hash) % fallbackColors.length]];
}
