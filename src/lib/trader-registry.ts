/**
 * Trader registry — discovers and persists wallets that have on-chain reputation.
 * New users appear on the leaderboard after they place bets (API register + explorer sync).
 */

import { promises as fs } from 'fs';
import path from 'path';
import { isAddress, getAddress } from 'viem';

const REGISTRY_PATH = path.join(process.cwd(), 'data', 'traders-registry.json');
const REGISTRY_TMP_PATH = path.join('/tmp', 'traders-registry.json');
const EXPLORER_BASE =
  process.env.NEXT_PUBLIC_SOMNIA_EXPLORER_API ||
  'https://shannon-explorer.somnia.network/api/v2';

const SEED_TRADERS = [
  '0x90356CF97B3BF1749A604d3F89b3DF3602A459E3',
] as const;

const REP_ADDRESS = '0x580ABA453b81D68a2C7714df6096ba75DD8bDEF9';
const PM_ADDRESS = '0x29C1a65695D8B9E23Fb7775d81a7C4792f9c5661';

/** Reject zero / tiny system-looking addresses (market ids misread as address) */
const MIN_ADDRESS_VALUE = 10_000n;

type RegistryFile = {
  traders: string[];
  updatedAt: number;
};

// In-memory fallback for serverless (Vercel ephemeral FS)
const memoryCache = new Set<string>();

function normalize(address: string): string | null {
  try {
    if (!isAddress(address)) return null;
    const checksummed = getAddress(address);
    if (BigInt(checksummed) < MIN_ADDRESS_VALUE) return null;
    return checksummed;
  } catch {
    return null;
  }
}

async function readRegistry(): Promise<Set<string>> {
  const set = new Set<string>();
  for (const a of SEED_TRADERS) {
    const n = normalize(a);
    if (n) set.add(n);
  }
  for (const a of memoryCache) set.add(a);

  const tryPaths = [REGISTRY_PATH, REGISTRY_TMP_PATH];
  for (const p of tryPaths) {
    try {
      const raw = await fs.readFile(p, 'utf8');
      const parsed = JSON.parse(raw) as RegistryFile;
      for (const a of parsed.traders || []) {
        const n = normalize(a);
        if (n) {
          set.add(n);
          memoryCache.add(n);
        }
      }
      if (parsed.traders?.length) break;
    } catch {}
  }
  return set;
}

async function writeRegistry(traders: Set<string>): Promise<void> {
  for (const a of traders) memoryCache.add(a);
  const payload: RegistryFile = {
    traders: [...traders].sort(),
    updatedAt: Date.now(),
  };
  const json = JSON.stringify(payload, null, 2);
  for (const p of [REGISTRY_PATH, REGISTRY_TMP_PATH]) {
    try {
      await fs.mkdir(path.dirname(p), { recursive: true });
      await fs.writeFile(p, json, 'utf8');
    } catch {}
  }
}

/** Persist a trader after they place a bet (any wallet). */
export async function registerTrader(address: string): Promise<void> {
  const n = normalize(address);
  if (!n) return;
  if (memoryCache.has(n)) return;
  const set = await readRegistry();
  if (set.has(n)) {
    memoryCache.add(n);
    return;
  }
  set.add(n);
  try {
    const latest = await readRegistry();
    for (const a of latest) set.add(a);
    set.add(n);
  } catch {}
  try {
    await writeRegistry(set);
  } catch (e) {
    console.warn('[trader-registry] register write failed', e);
  }
  memoryCache.add(n);
}

type ExplorerLog = {
  decoded?: {
    method_call?: string;
    parameters?: Array<{ name: string; type: string; value: string }>;
  };
  topics?: string[];
};

const TRADER_EVENTS =
  /BetPlaced|ReputationUpdated|PositionTaken|TradeCopied|TraderFollowed|MarketCreated|WinningsClaimed|BetSettled/i;

const TOPIC0_TO_TRADER_INDEX: Record<string, number[]> = {
  '0x55729538279d6ab38f60c9597030382bc483645129861fcb3e8c5f94a5c56e5b': [2],
  '0x57d0d124b72f81ed1da0dc728fc33db342705974792928796f6577b8db5c3d53': [2],
  '0x5380cf6fe903b40c6d5a9e0dfbca2f3a423f0a21520b4d5947ed5169bdba946d': [2],
  '0x6d4d544f5a6dcf38d77a232d3ef7358625c74877a1ad954fcb507872e7a05eaf': [],
  '0x8be0079c531659141344cd1fd0a4f28419497f9722a3daafe3b4186f6b6457e0': [],
  '0xeecad545a2ea4b549fd96ca809f2218e8daec7f3214b4813f4cddbc406ea803e': [1],
  '0x5b88a2e3fc1a53234357ab78c104df11c33ccfa79886793654565ad70b8afb6e': [1],
  '0x8bfb119fabaf3e781376eb32390e502a158b542f198e1fc7c411f5cf1fdd3485': [1],
  '0xf92e2764cafbd9c742f13b62d0ae347afed53f4a520562295deeb650ac63111c': [1, 2],
  '0x7904108cc6eb8de5dc0001238e78e615cf667bf18a071d7a7e20aeba42667a29': [1, 2],
};

function topicToAddress(topic: string | null | undefined): string | null {
  if (!topic || topic.length !== 66) return null;
  return normalize(`0x${topic.slice(26)}`);
}

function addressesFromLog(log: ExplorerLog): string[] {
  const out: string[] = [];
  const method = log.decoded?.method_call || '';
  const topic0 = (log.topics?.[0] || '').toLowerCase();
  const params = log.decoded?.parameters;
  if (params) {
    const keys = ['trader', 'user', 'follower', 'creator'];
    for (const key of keys) {
      const hit = params.find((p) => p.name.toLowerCase() === key && p.type === 'address');
      if (hit?.value) {
        const n = normalize(hit.value);
        if (n && !out.includes(n)) out.push(n);
      }
    }
    if (out.length) return out;
  }
  if (method && !TRADER_EVENTS.test(method)) return [];
  if (topic0 && TOPIC0_TO_TRADER_INDEX[topic0] !== undefined) {
    const idxs = TOPIC0_TO_TRADER_INDEX[topic0];
    for (const idx of idxs) {
      const addr = topicToAddress(log.topics?.[idx]);
      if (addr && !out.includes(addr)) out.push(addr);
    }
    return out;
  }
  if (/PositionTaken|WinningsClaimed|MarketCreated/i.test(method)) {
    const addr = topicToAddress(log.topics?.[2]);
    if (addr) out.push(addr);
    return out;
  }
  if (TRADER_EVENTS.test(method)) {
    const addr = topicToAddress(log.topics?.[1]);
    if (addr) out.push(addr);
    return out;
  }
  if (!method) {
    const t1 = log.topics?.[1];
    const t2 = log.topics?.[2];
    const a1 = topicToAddress(t1);
    const a2 = topicToAddress(t2);
    const rawT1 = t1 ? BigInt(t1) : null;
    const isT1Small = rawT1 !== null && rawT1 < MIN_ADDRESS_VALUE;
    if (isT1Small && a2) {
      out.push(a2);
      return out;
    }
    if (a1 && !out.includes(a1)) out.push(a1);
    return out;
  }
  return out;
}

function addressFromLog(log: ExplorerLog): string | null {
  const addrs = addressesFromLog(log);
  return addrs[0] || null;
}

async function fetchExplorerLogs(contract: string, maxPages = 10): Promise<Set<string>> {
  const found = new Set<string>();
  let nextUrl: string | null = `${EXPLORER_BASE}/addresses/${contract}/logs?items_count=50`;
  for (let page = 0; page < maxPages && nextUrl; page++) {
    try {
      const res = await fetch(nextUrl, { headers: { Accept: 'application/json' }, next: { revalidate: 30 } });
      if (!res.ok) break;
      const json = (await res.json()) as { items?: ExplorerLog[]; next_page_params?: Record<string, string | number> | null };
      for (const item of json.items || []) {
        const addrs = addressesFromLog(item);
        for (const addr of addrs) found.add(addr);
        if (addrs.length === 0) {
          const single = addressFromLog(item);
          if (single) found.add(single);
        }
      }
      if (json.next_page_params) {
        const q = new URLSearchParams(Object.entries(json.next_page_params).map(([k, v]) => [k, String(v)]));
        nextUrl = `${EXPLORER_BASE}/addresses/${contract}/logs?${q.toString()}`;
      } else nextUrl = null;
    } catch (e) {
      console.warn('[trader-registry] explorer fetch failed', e);
      break;
    }
  }
  return found;
}

export async function getDiscoveredTraders(): Promise<string[]> {
  const set = await readRegistry();
  const [fromRep, fromPm] = await Promise.all([fetchExplorerLogs(REP_ADDRESS), fetchExplorerLogs(PM_ADDRESS)]);
  for (const a of fromRep) set.add(a);
  for (const a of fromPm) set.add(a);
  try {
    const latest = await readRegistry();
    for (const a of latest) set.add(a);
    for (const a of memoryCache) set.add(a);
  } catch {}
  try {
    await writeRegistry(set);
  } catch (e) {
    console.warn('[trader-registry] writeRegistry failed', e);
  }
  return [...set];
}
