export type PlanAccent = 'violet' | 'cyan' | 'emerald' | 'amber' | 'rose' | 'slate';

export interface PlanOffchainImage {
  src: string; // e.g. "/plan-images/30-day-standard.svg"
  alt?: string;
}

export interface PlanOffchainDisplay {
  title: string;
  description?: string;
  highlights?: string[];
  recommended?: boolean;
  accent?: PlanAccent;
  image?: PlanOffchainImage;
}

export interface PlanOffchainMatch {
  planId?: number; // optional: stable only within a deployment
  name?: string;
  durationDays?: number;
}

export interface PlanOffchainMetadataEntry {
  key: string;
  match: PlanOffchainMatch;
  display: PlanOffchainDisplay;
}

export interface PlanOffchainMetadataFile {
  version: number;
  updatedAt?: string;
  plans: PlanOffchainMetadataEntry[];
}

let cached: PlanOffchainMetadataFile | null = null;
let inflight: Promise<PlanOffchainMetadataFile | null> | null = null;

export async function loadPlanMetadata(): Promise<PlanOffchainMetadataFile | null> {
  if (cached) return cached;
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const res = await fetch('/plan-metadata.json', { cache: 'no-cache' });
      if (!res.ok) return null;
      const json = (await res.json()) as PlanOffchainMetadataFile;
      cached = json;
      return cached;
    } catch {
      return null;
    } finally {
      inflight = null;
    }
  })();

  return inflight;
}

export function pickPlanMetadata(
  file: PlanOffchainMetadataFile | null,
  args: { planId: number; name: string; durationDays: number }
): PlanOffchainMetadataEntry | undefined {
  if (!file) return undefined;

  // Prefer matching by planId (if you supply it), else name+durationDays.
  const byId = file.plans.find((p) => p.match.planId != null && p.match.planId === args.planId);
  if (byId) return byId;

  const normalizedName = args.name.trim().toLowerCase();
  return file.plans.find((p) => {
    const matchName = (p.match.name ?? '').trim().toLowerCase();
    const matchDays = p.match.durationDays;
    return matchName === normalizedName && matchDays === args.durationDays;
  });
}

