"use client";

import { GlobeAltIcon } from "@heroicons/react/24/outline";
import { COUNTRIES, countryFlag } from "@/libs/countries";
import { IOS_CATEGORIES, CATEGORY_MAP, ANDROID_CATEGORIES, ANDROID_CATEGORY_MAP } from "@/libs/categories";
import { Dropdown, DropdownOption } from "./Dropdown";
import { StoreIcon } from "./StoreIcon";
import { DEFAULT_FILTERS, type Filters, type StoreFilter } from "./types";

const STORE_LABEL: Record<StoreFilter, string> = {
  all: "All Stores",
  ios: "App Store",
  android: "Google Play",
};

const DEVICE_LABEL: Record<Filters["device"], string> = {
  all: "All devices",
  iphone: "iPhone",
  ipad: "iPad",
};

const CHART_LABEL: Record<Filters["chart"], string> = {
  free: "Top Free",
  paid: "Top Paid",
  grossing: "Top Grossing",
  new: "New Apps",
};

// "major"/"other" are the country filter's curated-set sentinels (see
// MAJOR_MARKET_COUNTRIES / OTHER_MARKET_COUNTRIES in types.ts).
const COUNTRY_FILTER_LABEL: Record<"major" | "other", string> = {
  major: "Major Markets",
  other: "Other Markets",
};

function countryFilterLabel(sentinel: "major" | "other"): string {
  return COUNTRY_FILTER_LABEL[sentinel];
}

// Google Play has no device-specific charts, which is why Device gets
// disabled for it below. It also has no "new apps" feed at all — unlike iOS's
// New Apps (Apple's live feed), Android's New Apps is sourced from our own
// accumulating catalog (see market_apps / the crawl-market-apps cron), so the
// label calls that out rather than implying parity with Apple's feed.
const CHART_OPTIONS_BY_STORE: Record<StoreFilter, Filters["chart"][]> = {
  all: ["free", "paid", "grossing", "new"],
  ios: ["free", "paid", "grossing", "new"],
  android: ["free", "paid", "grossing", "new"],
};

function chartLabel(chart: Filters["chart"], store: StoreFilter): string {
  if (chart !== "new") return CHART_LABEL[chart];
  if (store === "android") return "New Apps (discovered)";
  if (store === "all") return "New Apps (mixed sourcing)";
  return CHART_LABEL[chart];
}

// StoreIcon only knows "ios" | "android" — "all" gets a generic globe mark
// here rather than teaching the shared icon component a third, filter-only case.
function StoreFilterIcon({ store, className }: { store: StoreFilter; className?: string }) {
  if (store === "all") return <GlobeAltIcon className={className} />;
  return <StoreIcon store={store} className={className} />;
}

type Props = {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
};

export function ExplorerFilters({ filters, onChange }: Props) {
  const isAndroid = filters.store === "android";
  const isAllStores = filters.store === "all";
  const deviceDisabled = isAndroid || isAllStores || filters.chart === "new";
  // Category ids are a different id space per store, so there's no single
  // list that's meaningful across both — the dropdown is disabled instead.
  const categoryDisabled = isAllStores;
  const categories = isAndroid ? ANDROID_CATEGORIES : IOS_CATEGORIES;
  const categoryMap = isAndroid ? ANDROID_CATEGORY_MAP : CATEGORY_MAP;

  function selectStore(store: StoreFilter) {
    // Category ids are a different id space per store, so they reset rather
    // than carrying over silently. "new" is valid on both stores now, so it
    // survives the switch (its meaning just changes underneath it).
    onChange({ store, category: "all" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-6 py-4">
      <Dropdown
        label={<span className="inline-flex items-center gap-1.5"><StoreFilterIcon store={filters.store} className="size-3.5" />{STORE_LABEL[filters.store]}</span>}
        active={filters.store !== DEFAULT_FILTERS.store}
      >
        <div className="flex flex-col gap-0.5">
          {(Object.keys(STORE_LABEL) as StoreFilter[]).map((s) => (
            <DropdownOption
              key={s}
              label={<span className="inline-flex items-center gap-1.5"><StoreFilterIcon store={s} className="size-3.5" />{STORE_LABEL[s]}</span>}
              active={filters.store === s}
              onClick={() => selectStore(s)}
            />
          ))}
        </div>
      </Dropdown>

      <div className={deviceDisabled ? "opacity-40 pointer-events-none" : ""} title={deviceDisabled ? (isAllStores ? "Device doesn't apply across both stores" : isAndroid ? "Google Play charts aren't split by device" : "New Apps is a single universal chart — device doesn't apply") : undefined}>
        <Dropdown label={DEVICE_LABEL[filters.device]} active={filters.device !== DEFAULT_FILTERS.device}>
          <div className="flex flex-col gap-0.5">
            {(Object.keys(DEVICE_LABEL) as Filters["device"][]).map((d) => (
              <DropdownOption key={d} label={DEVICE_LABEL[d]} active={filters.device === d} onClick={() => onChange({ device: d })} />
            ))}
          </div>
        </Dropdown>
      </div>

      <div className={categoryDisabled ? "opacity-40 pointer-events-none" : ""} title={categoryDisabled ? "Categories differ between App Store and Google Play — pick a single store to filter by category" : undefined}>
        <Dropdown
          label={filters.category === "all" ? "All Categories" : categoryMap[filters.category] ?? "Category"}
          active={filters.category !== DEFAULT_FILTERS.category}
        >
          <div className="flex flex-col gap-0.5">
            <DropdownOption label="All Categories" active={filters.category === "all"} onClick={() => onChange({ category: "all" })} />
            {categories.map((c) => (
              <DropdownOption key={c.id} label={c.label} active={filters.category === c.id} onClick={() => onChange({ category: c.id })} />
            ))}
          </div>
        </Dropdown>
      </div>

      <Dropdown
        label={
          filters.country === "major" || filters.country === "other"
            ? <span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="size-3.5" />{countryFilterLabel(filters.country)}</span>
            : `${countryFlag(filters.country)} ${COUNTRIES.find((c) => c.code === filters.country)?.label ?? filters.country}`
        }
        active={filters.country !== DEFAULT_FILTERS.country}
      >
        <div className="flex flex-col gap-0.5">
          <DropdownOption
            label={<span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="size-3.5" />{countryFilterLabel("major")}</span>}
            active={filters.country === "major"}
            onClick={() => onChange({ country: "major" })}
          />
          <DropdownOption
            label={<span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="size-3.5" />{countryFilterLabel("other")}</span>}
            active={filters.country === "other"}
            onClick={() => onChange({ country: "other" })}
          />
          {COUNTRIES.map((c) => (
            <DropdownOption
              key={c.code}
              label={`${countryFlag(c.code)} ${c.label}`}
              active={filters.country === c.code}
              onClick={() => onChange({ country: c.code })}
            />
          ))}
        </div>
      </Dropdown>

      <Dropdown label={chartLabel(filters.chart, filters.store)} active={filters.chart !== DEFAULT_FILTERS.chart}>
        <div className="flex flex-col gap-0.5">
          {CHART_OPTIONS_BY_STORE[filters.store].map((c) => (
            <DropdownOption key={c} label={chartLabel(c, filters.store)} active={filters.chart === c} onClick={() => onChange({ chart: c })} />
          ))}
        </div>
      </Dropdown>
    </div>
  );
}
