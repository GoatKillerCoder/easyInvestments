import { useEffect, useState } from "react";
import type { PortfolioHolding } from "@/lib/manual-account-data";

// Simulated market data only: nothing here comes from a real market data provider.

export const TICK_INTERVAL_MS = 2500;
const MAX_STEP_PCT = 0.25; // largest move per tick, in percentage points
const MAX_DAY_SWING_PCT = 5; // largest distance from the day's open, in percentage points

export type SimulatedHolding = PortfolioHolding & {
  /** Current simulated performance for the day, in percent. */
  pct: number;
  /** Simulated market value in ZAR, derived from the price movement. */
  value: number;
  /** Direction of the latest tick: 1 up, -1 down, 0 unchanged. */
  tick: -1 | 0 | 1;
};

type AssetState = {
  baseValue: number;
  basePct: number;
  startPct: number;
  pct: number;
  prevPct: number;
  momentum: number;
  calmTicks: number;
  volatility: number;
  beta: number;
};

export type MarketState = {
  key: string;
  rng: () => number;
  assets: AssetState[];
  marketMood: number;
  updatedAt: number;
};

const volatilityByTicker: Record<string, number> = {
  GOOGL: 0.1,
  SP500: 0.05,
  NPN: 0.13,
};

export function dayKey(date = new Date()) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function seededRandom(seedText: string) {
  let seed = hashString(seedText);
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number) {
  const u = Math.max(rng(), 1e-9);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function parsePct(text: string) {
  const parsed = Number.parseFloat(text.replace(",", ".").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function createMarketState(holdings: PortfolioHolding[], day = dayKey()): MarketState {
  const key = `${day}|${holdings.map((h) => `${h.ticker}:${h.marketValue}:${h.changePct}`).join(",")}`;
  const rng = seededRandom(`open|${key}`);

  const assets = holdings.map((holding) => {
    const basePct = parsePct(holding.changePct);
    // A fresh, bounded starting point for each day.
    const startPct = clamp(basePct + (rng() - 0.5) * 1.6, -3, 4);
    return {
      baseValue: holding.marketValue,
      basePct,
      startPct,
      pct: startPct,
      prevPct: startPct,
      momentum: 0,
      calmTicks: 0,
      volatility: volatilityByTicker[holding.ticker] ?? 0.06 + rng() * 0.06,
      beta: 0.6 + rng() * 0.8,
    };
  });

  return { key, rng, assets, marketMood: 0, updatedAt: Date.now() };
}

export function stepMarket(state: MarketState) {
  const { rng } = state;
  // Slowly drifting shared market mood; assets follow it by different amounts.
  state.marketMood = clamp(state.marketMood * 0.9 + gaussian(rng) * 0.02, -0.06, 0.06);

  for (const asset of state.assets) {
    asset.prevPct = asset.pct;

    if (asset.calmTicks > 0) {
      asset.calmTicks -= 1;
    } else if (rng() < 0.1) {
      asset.calmTicks = 2 + Math.floor(rng() * 4);
    }

    const calmFactor = asset.calmTicks > 0 ? 0.15 : 1;
    const noise = gaussian(rng) * asset.volatility * calmFactor;
    const pull = (asset.startPct - asset.pct) * 0.02;
    const move = clamp(
      asset.momentum * 0.3 + noise + state.marketMood * asset.beta * calmFactor + pull,
      -MAX_STEP_PCT,
      MAX_STEP_PCT,
    );

    asset.momentum = move;
    asset.pct = clamp(
      asset.pct + move,
      asset.startPct - MAX_DAY_SWING_PCT,
      asset.startPct + MAX_DAY_SWING_PCT,
    );
  }
  state.updatedAt = Date.now();
}

export function snapshotHoldings(
  holdings: PortfolioHolding[],
  state: MarketState,
): SimulatedHolding[] {
  return holdings.map((holding, index) => {
    const asset = state.assets[index];
    // Value is tied to price: value = base value * (1 + pct) / (1 + base pct).
    const value = (asset.baseValue * (1 + asset.pct / 100)) / (1 + asset.basePct / 100);
    const delta = Math.round(asset.pct * 100) - Math.round(asset.prevPct * 100);
    return {
      ...holding,
      pct: asset.pct,
      value: Math.round(value * 100) / 100,
      tick: delta > 0 ? 1 : delta < 0 ? -1 : 0,
    };
  });
}

export function formatPct(pct: number) {
  const rounded = Math.round(pct * 100) / 100;
  const sign = rounded > 0 ? "+" : rounded < 0 ? "-" : "";
  return `${sign}${Math.abs(rounded).toFixed(2)}%`;
}

// Keeps the simulation continuous across renders and route changes within a session.
let cachedState: MarketState | undefined;

function getState(holdings: PortfolioHolding[]) {
  const next = createMarketState(holdings);
  if (cachedState?.key !== next.key) cachedState = next;
  return cachedState;
}

export function useSimulatedMarket(holdings: PortfolioHolding[] | undefined) {
  const [, setVersion] = useState(0);
  const list = holdings ?? [];
  const signature = list.map((h) => `${h.ticker}:${h.marketValue}:${h.changePct}`).join(",");

  useEffect(() => {
    if (!list.length) return;
    const state = getState(list);
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setVersion((v) => v + 1);
      return;
    }
    const timer = window.setInterval(() => {
      stepMarket(state);
      setVersion((v) => v + 1);
    }, TICK_INTERVAL_MS);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  if (!list.length) return { holdings: [] as SimulatedHolding[], valueDelta: 0 };

  const simulated = snapshotHoldings(list, getState(list));
  const valueDelta = simulated.reduce((sum, h, i) => sum + h.value - list[i].marketValue, 0);
  return { holdings: simulated, valueDelta };
}
