"use client";

import { useMemo, useState } from "react";
import { GlobeAltIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { COUNTRIES, countryFlag } from "@/libs/countries";
import { Dropdown, DropdownOption } from "@/features/market/explorer/Dropdown";

type Props = {
  country: string;
  defaultCountry: string;
  onChange: (code: string) => void;
};

// COUNTRIES has ~169 entries — Explorer's country dropdown gets away with a
// plain scrollable list because it front-loads two curated "Major/Other
// Markets" shortcuts (see MAJOR_MARKET_COUNTRIES), but Compare always needs
// one specific storefront, so a search box to jump straight to it earns its
// keep here.
export function CountryDropdown({ country, defaultCountry, onChange }: Props) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COUNTRIES;
    return COUNTRIES.filter((c) => c.label.toLowerCase().includes(q) || c.code.toLowerCase() === q);
  }, [query]);

  const current = COUNTRIES.find((c) => c.code === country);

  return (
    <Dropdown
      label={<span className="inline-flex items-center gap-1.5"><GlobeAltIcon className="size-3.5" />{countryFlag(country)} {current?.label ?? country}</span>}
      active={country !== defaultCountry}
    >
      <div className="flex flex-col gap-0.5">
        {/* Sticky within Dropdown's own scrolling wrapper (max-h-80 overflow-y-auto) —
            the negative inset cancels that wrapper's p-1.5 so this sits flush at the
            top instead of leaving a gap the list could peek through while scrolling. */}
        <div className="sticky -top-1.5 -mx-1.5 z-10 bg-[#1a1d24] px-1.5 pt-1.5 pb-1.5">
          <div className="flex items-center gap-1.5 rounded-md bg-[#0d0f14] ring-1 ring-white/[0.08] px-2.5 py-1.5">
            <MagnifyingGlassIcon className="size-3.5 text-gray-500 shrink-0" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search countries"
              className="flex-1 bg-transparent text-xs text-gray-300 placeholder-gray-600 outline-none min-w-0"
            />
          </div>
        </div>

        {filtered.length > 0 ? (
          filtered.map((c) => (
            <DropdownOption
              key={c.code}
              label={`${countryFlag(c.code)} ${c.label}`}
              active={country === c.code}
              onClick={() => onChange(c.code)}
            />
          ))
        ) : (
          <p className="px-2.5 py-3 text-center text-xs text-gray-600">No countries match &quot;{query}&quot;</p>
        )}
      </div>
    </Dropdown>
  );
}
