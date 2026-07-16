"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  finderBrandNames,
  finderModels,
  finderPositions,
  findKit,
  savingsPercent,
} from "@/lib/products";
import { gbp } from "@/lib/format";

export function FinderTool() {
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [position, setPosition] = useState("");

  const brands = useMemo(() => finderBrandNames(), []);
  const models = useMemo(() => (brand ? finderModels(brand) : []), [brand]);
  const positions = useMemo(
    () => (brand && model ? finderPositions(brand, model) : []),
    [brand, model],
  );

  const result = brand && model && position ? findKit(brand, model, position) : undefined;

  function Step({
    n,
    label,
    value,
    onChange,
    options,
    disabled,
    placeholder,
  }: {
    n: number;
    label: string;
    value: string;
    onChange: (v: string) => void;
    options: string[];
    disabled?: boolean;
    placeholder: string;
  }) {
    return (
      <div>
        <div className="mb-2 flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange text-xs font-bold text-white">
            {n}
          </span>
          <span className="text-sm font-bold text-navy">{label}</span>
        </div>
        <select
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-3 text-sm font-medium text-ink outline-none focus:border-orange focus:ring-2 focus:ring-orange/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3">
        <Step
          n={1}
          label="Brand"
          value={brand}
          onChange={(v) => {
            setBrand(v);
            setModel("");
            setPosition("");
          }}
          options={brands}
          placeholder="Pick a brand"
        />
        <Step
          n={2}
          label="Model"
          value={model}
          onChange={(v) => {
            setModel(v);
            setPosition("");
          }}
          options={models}
          disabled={!brand}
          placeholder={brand ? "Pick a model" : "Brand first"}
        />
        <Step
          n={3}
          label="Cylinder position"
          value={position}
          onChange={setPosition}
          options={positions}
          disabled={!model}
          placeholder={model ? "Pick a position" : "Model first"}
        />
      </div>

      {brand && model && position && !result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-display text-lg font-bold text-navy">
            Hmm, we don&apos;t list that exact one yet.
          </p>
          <p className="mt-2 text-sm text-slate-brand">
            We carry thousands of sizes off-catalogue.{" "}
            <a
              href="https://wa.me/440000000000"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-orange hover:underline"
            >
              WhatsApp us the machine
            </a>{" "}
            and we&apos;ll check the shelf.
          </p>
        </div>
      )}

      {result && (
        <div className="overflow-hidden rounded-2xl border-2 border-orange/30 bg-orange/5">
          <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded bg-navy px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                  {result.sku}
                </span>
                {result.crossRefs[0] && (
                  <span className="rounded bg-orange px-2 py-0.5 font-mono text-[11px] font-bold text-white">
                    {result.crossRefs[0].source}: {result.crossRefs[0].part}
                  </span>
                )}
              </div>
              <h2 className="mt-2 font-display text-xl font-extrabold text-navy">
                {result.name}
              </h2>
              <p className="mt-1 text-sm text-slate-brand">
                {result.rod}mm rod × {result.bore}mm bore · {result.material}
              </p>
            </div>

            <div className="text-right">
              <p className="text-xs text-slate-brand line-through">FPE {gbp(result.fpePrice)}</p>
              <p className="font-display text-3xl font-extrabold text-navy">
                {gbp(result.price)}
                <span className="ml-1 text-xs font-medium text-slate-brand">ex-VAT</span>
              </p>
              <p className="text-sm font-bold text-success">
                Save {savingsPercent(result)}%
              </p>
              <Link
                href={`/product/${result.sku}`}
                className="mt-3 inline-block rounded-lg bg-orange px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-orange-600"
              >
                View full kit →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
