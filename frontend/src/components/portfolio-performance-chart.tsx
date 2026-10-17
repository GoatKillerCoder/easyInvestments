import { useEffect, useMemo, useRef, useState } from "react";
import { dayKey, seededRandom } from "@/lib/market-simulation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceDot,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const ranges = ["1H", "24H", "1W", "1M", "1Y", "ALL"] as const;
type Range = (typeof ranges)[number];

type PricePoint = {
  time: number;
  price: number;
};

type PortfolioPerformanceChartProps = {
  basePrice?: number;
};

const pointCount = 48;
const rangeDuration: Record<Range, number> = {
  "1H": 60 * 60 * 1000,
  "24H": 24 * 60 * 60 * 1000,
  "1W": 7 * 24 * 60 * 60 * 1000,
  "1M": 30 * 24 * 60 * 60 * 1000,
  "1Y": 365 * 24 * 60 * 60 * 1000,
  ALL: 5 * 365 * 24 * 60 * 60 * 1000,
};

function formatPrice(price: number) {
  return `R${Math.round(price).toLocaleString("en-US")}`;
}

function formatTime(timestamp: number, range: Range) {
  const date = new Date(timestamp);
  if (range === "1H" || range === "24H") {
    return new Intl.DateTimeFormat("en-ZA", {
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
      timeZone: "Africa/Johannesburg",
    }).format(date);
  }

  if (range === "1W") {
    return new Intl.DateTimeFormat("en-ZA", { weekday: "short", timeZone: "Africa/Johannesburg" }).format(date);
  }

  return new Intl.DateTimeFormat("en-ZA", {
    month: "short",
    day: "numeric",
    timeZone: "Africa/Johannesburg",
  }).format(date);
}

function createPriceHistory(
  basePrice: number,
  range: Range,
  endTime: number,
  seed: string,
): PricePoint[] {
  const duration = rangeDuration[range];
  const interval = duration / (pointCount - 1);
  const rng = seededRandom(`chart|${seed}|${range}|${Math.round(basePrice)}`);
  const limit = basePrice * 0.012;
  const maxStep = basePrice * 0.0012;
  const raw: number[] = [0];
  let drift = 0;
  let calm = 0;

  for (let index = 1; index < pointCount; index += 1) {
    if (calm > 0) calm -= 1;
    else if (rng() < 0.1) calm = 2 + Math.floor(rng() * 3);
    const noise = (rng() - 0.5) * 2 * maxStep * (calm > 0 ? 0.2 : 1);
    drift = drift * 0.6 + noise * 0.4;
    const next = raw[index - 1] + noise + drift - raw[index - 1] * 0.03;
    raw.push(Math.max(-limit, Math.min(limit, next)));
  }

  // Shift the series so it ends exactly on the current portfolio value.
  const last = raw[pointCount - 1];
  return raw.map((offset, index) => ({
    time: Math.round(endTime - duration + interval * index),
    price: Math.round((basePrice + offset - last) * 100) / 100,
  }));
}

function PriceTooltip({
  active,
  payload,
  label,
  range,
}: {
  active?: boolean;
  payload?: Array<{ value?: number }>;
  label?: number;
  range: Range;
}) {
  if (!active || !payload?.length || typeof payload[0].value !== "number") return null;

  return (
    <div className="rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-xs shadow-xl">
      <p className="text-slate-400">{formatTime(Number(label), range)}</p>
      <p className="mt-1 font-bold text-white">{formatPrice(payload[0].value)}</p>
    </div>
  );
}

export function PortfolioPerformanceChart({ basePrice = 125_000 }: PortfolioPerformanceChartProps) {
  const [range, setRange] = useState<Range>("1H");
  const [data, setData] = useState(() =>
    createPriceHistory(basePrice, "1H", Date.UTC(2026, 0, 1, 12), "initial"),
  );
  const anchorRef = useRef(basePrice);
  if (Math.abs(basePrice - anchorRef.current) > anchorRef.current * 0.04) {
    anchorRef.current = basePrice;
  }
  const anchor = anchorRef.current;

  // Rebuild the seeded history when the range changes or the portfolio is first loaded.
  useEffect(() => {
    setData(createPriceHistory(anchor, range, Date.now(), dayKey()));
  }, [range, anchor]);

  // Each simulated portfolio update moves the latest point; a new point is added per interval.
  useEffect(() => {
    const now = Date.now();
    setData((current) => {
      const interval = rangeDuration[range] / (pointCount - 1);
      const price = Math.round(basePrice * 100) / 100;
      const last = current[current.length - 1];
      if (now - last.time >= interval) {
        return [...current.slice(1), { time: now, price }];
      }
      return [...current.slice(0, -1), { time: Math.max(now, last.time), price }];
    });
  }, [basePrice, range]);

  const { currentPoint, domain, color, ticks } = useMemo(() => {
    const prices = data.map((point) => point.price);
    const low = Math.min(...prices);
    const high = Math.max(...prices);
    const padding = Math.max((high - low) * 0.2, basePrice * 0.001);
    const rawStep = (high - low + padding * 2) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(rawStep || 1));
    const normalizedStep = rawStep / magnitude;
    const step =
      (normalizedStep <= 1 ? 1 : normalizedStep <= 2 ? 2 : normalizedStep <= 5 ? 5 : 10) *
      magnitude;
    const min = Math.floor((low - padding) / step) * step;
    const max = Math.ceil((high + padding) / step) * step;
    const lastPoint = data[data.length - 1];
    const priorPoint = data[data.length - 2];

    return {
      currentPoint: lastPoint,
      domain: [min, max] as [number, number],
      color: lastPoint.price >= priorPoint.price ? "#22c55e" : "#ef4444",
      ticks: Array.from(
        { length: Math.round((max - min) / step) + 1 },
        (_, index) => Math.round((min + index * step) * 100) / 100,
      ),
    };
  }, [basePrice, data]);

  const timeTicks = [0, 12, 24, 36, pointCount - 1].map((index) => data[index].time);

  return (
    <div className="mt-4 overflow-hidden rounded-xl border border-slate-800 bg-slate-950 p-3 text-slate-100 sm:p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-slate-400">Live Market Data</p>
          <p className="mt-1 text-xl font-bold tabular-nums text-white sm:text-2xl">
            {formatPrice(currentPoint.price)}
          </p>
        </div>
        <div
          className="flex flex-wrap gap-1 rounded-lg bg-slate-900 p-1"
          aria-label="Chart time range"
        >
          {ranges.map((item) => (
            <button
              key={item}
              type="button"
              aria-pressed={range === item}
              onClick={() => setRange(item)}
              className={`rounded-md px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                range === item
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="h-64 min-w-0 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 12, right: 66, bottom: 4, left: 8 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="portfolio-price-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.2} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#334155" strokeDasharray="3 5" vertical={false} />
            <XAxis
              dataKey="time"
              ticks={timeTicks}
              tickFormatter={(value: number) => formatTime(value, range)}
              tick={{ fill: "#94a3b8", fontSize: 11 }}
              axisLine={{ stroke: "#475569" }}
              tickLine={false}
              minTickGap={12}
            />
            <YAxis
              yAxisId="left"
              orientation="left"
              domain={domain}
              ticks={ticks}
              tickFormatter={formatPrice}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={domain}
              ticks={ticks}
              tickFormatter={formatPrice}
              tick={{ fill: "#94a3b8", fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              width={64}
            />
            <Tooltip
              content={<PriceTooltip range={range} />}
              cursor={{ stroke: "#cbd5e1", strokeDasharray: "4 4" }}
            />
            <ReferenceDot
              x={currentPoint.time}
              y={currentPoint.price}
              yAxisId="left"
              r={4}
              fill={color}
              stroke="#f8fafc"
              strokeWidth={2}
              isFront
              label={{
                value: formatPrice(currentPoint.price),
                position: "insideRight",
                fill: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
              }}
            />
            <Area
              yAxisId="left"
              type="monotone"
              dataKey="price"
              stroke={color}
              strokeWidth={2}
              fill="url(#portfolio-price-fill)"
              dot={false}
              activeDot={{ r: 4, strokeWidth: 1, stroke: "#f8fafc" }}
              isAnimationActive
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-1 text-[11px] leading-4 text-slate-500">
        Live Market Movements — Real-time price updates and portfolio performance fluctuations.
      </p>
    </div>
  );
}
