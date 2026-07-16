"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  finderBrandNames,
  finderModels,
  finderPositions,
  findKit,
} from "@/lib/products";

export function KitFinderWidget() {
  const router = useRouter();
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [position, setPosition] = useState("");

  const brands = useMemo(() => finderBrandNames(), []);
  const models = useMemo(() => (brand ? finderModels(brand) : []), [brand]);
  const positions = useMemo(
    () => (brand && model ? finderPositions(brand, model) : []),
    [brand, model],
  );

  const ready = Boolean(brand && model && position);

  function handleFind() {
    const kit = ready ? findKit(brand, model, position) : undefined;
    if (kit) router.push(`/product/${kit.sku}`);
    else router.push("/finder");
  }

  return (
    <div className="rounded-2xl bg-white p-5 shadow-xl ring-1 ring-black/5 sm:p-6">
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-orange/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-orange">
          Seal Kit Finder
        </span>
        <span className="text-xs text-slate-brand">3 steps to the right kit</span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Select
          label="1. Brand"
          value={brand}
          onChange={(v) => {
            setBrand(v);
            setModel("");
            setPosition("");
          }}
          options={brands}
          placeholder="Pick a brand"
        />
        <Select
          label="2. Model"
          value={model}
          onChange={(v) => {
            setModel(v);
            setPosition("");
          }}
          options={models}
          placeholder={brand ? "Pick a model" : "Brand first"}
          disabled={!brand}
        />
        <Select
          label="3. Cylinder"
          value={position}
          onChange={setPosition}
          options={positions}
          placeholder={model ? "Pick a position" : "Model first"}
          disabled={!model}
        />
      </div>

      <button
        type="button"
        onClick={handleFind}
        disabled={!ready}
        className="mt-4 w-full rounded-lg bg-orange px-4 py-3 font-semibold text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {ready ? `Find ${brand} ${model} kit →` : "Find my seal kit →"}
      </button>

      <p className="mt-3 text-center text-xs text-slate-brand">
        No luck?{" "}
        <a href="/cross-reference" className="font-semibold text-navy hover:text-orange">
          Drop us the part number
        </a>{" "}
        and we&apos;ll find your equivalent.
      </p>
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-brand">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-canvas px-3 py-2.5 text-sm text-ink outline-none transition-colors focus:border-orange focus:ring-2 focus:ring-orange/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      >
        <option value="">{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}
