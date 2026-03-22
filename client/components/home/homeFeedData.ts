import { getEvents, type Event } from "@/services/event.service";
import type { EventData } from "@/types/events";
import { perfLog, perfNow } from "@/lib/perf";

const PINATA_GW = "https://gateway.pinata.cloud/ipfs";
const CACHE_TTL_MS = 30_000;

type HomeFeedData = {
  curated: EventData[];
  voteEvents: EventData[];
  postEvents: EventData[];
};

let cache: { data: HomeFeedData; ts: number } | null = null;
let inFlight: Promise<HomeFeedData> | null = null;

function computeTimeRemaining(endTime: string): string {
  const diff = new Date(endTime).getTime() - Date.now();
  if (diff <= 0) return "Ended";
  const h = Math.floor(diff / 3600000);
  if (h < 24) return `${h}h left`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}

function toEventData(e: Event): EventData {
  const statusMap: Record<string, EventData["status"]> = {
    posting: "live",
    voting: "live",
    scheduled: "upcoming",
    draft: "upcoming",
    completed: "ended",
  };

  return {
    id: e.id,
    mode: e.eventType === "vote_only" ? "vote" : "post",
    status: statusMap[e.status] ?? "upcoming",
    title: e.title,
    creator: {
      name: e.brand?.name ?? "Unknown",
      avatar: e.brand?.logoUrl || (e.brand?.logoCid ? `${PINATA_GW}/${e.brand.logoCid}` : ""),
      handle: `@${(e.brand?.name ?? "").toLowerCase().replace(/\s+/g, "")}`,
    },
    rewardPool: `$${(e.leaderboardPool ?? 0).toLocaleString()}`,
    baseReward: `$${(e.baseReward ?? 0).toFixed(2)}`,
    topReward: e.topReward ? `$${e.topReward.toLocaleString()}` : undefined,
    participationCount: e._count?.submissions ?? e._count?.votes ?? 0,
    timeRemaining: computeTimeRemaining(e.endTime),
    image:
      e.imageUrl ||
      (e.imageCid
        ? `${PINATA_GW}/${e.imageCid}`
        : "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=800&q=80"),
    description: e.description ?? "",
    progress: undefined,
    userState: undefined,
  };
}

export async function getHomeFeedData(force = false): Promise<HomeFeedData> {
  const now = Date.now();

  if (!force && cache && now - cache.ts < CACHE_TTL_MS) {
    perfLog("home-feed", "cache hit");
    return cache.data;
  }

  if (inFlight) return inFlight;

  const start = perfNow();
  inFlight = (async () => {
    const [curatedRes, voteRes, postRes] = await Promise.all([
      getEvents({ limit: 10 }),
      getEvents({ limit: 10, eventType: "vote_only" }),
      getEvents({ limit: 10, eventType: "post_and_vote" }),
    ]);

    const data: HomeFeedData = {
      curated: (curatedRes.events || []).map(toEventData),
      voteEvents: (voteRes.events || []).map(toEventData),
      postEvents: (postRes.events || []).map(toEventData),
    };

    cache = { data, ts: Date.now() };
    perfLog("home-feed", `fetched in ${(perfNow() - start).toFixed(1)}ms`, {
      curated: data.curated.length,
      voteEvents: data.voteEvents.length,
      postEvents: data.postEvents.length,
    });
    return data;
  })().finally(() => {
    inFlight = null;
  });

  return inFlight;
}
