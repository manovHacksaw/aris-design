import { type Event } from "@/services/event.service";
import { perfLog, perfNow } from "@/lib/perf";
const CACHE_TTL_MS = 30_000;

type HomeFeedData = {
  curated: Event[];
  voteEvents: Event[];
  postEvents: Event[];
};

let cache: { data: HomeFeedData; ts: number } | null = null;
let inFlight: Promise<HomeFeedData> | null = null;

export async function getHomeFeedData(force = false): Promise<HomeFeedData> {
  const now = Date.now();

  if (!force && cache && now - cache.ts < CACHE_TTL_MS) {
    perfLog("home-feed", "cache hit");
    return cache.data;
  }

  if (inFlight) return inFlight;

  const start = perfNow();
  inFlight = (async () => {
    const { getHomeEvents } = await import("@/services/home.service");
    const res = await getHomeEvents();

    const data: HomeFeedData = {
      curated: res.curated || [],
      voteEvents: res.voteEvents || [],
      postEvents: res.postEvents || [],
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
