"use client";

import { useEffect, useMemo, useState } from "react";

type LegacyGuide = {
  accentColor: string;
  accentColorLight: string;
  visaBg: string;
  hero: {
    tagline: string;
    code: string;
    pills: Array<{ emoji: string; text: string }>;
  };
  vibe: {
    title: string;
    body: string;
    tags: Array<{ label: string; type?: string }>;
  };
  bestTime: {
    period: string;
    note: string;
  };
  visa: {
    title: string;
    body: string;
  };
  stats: {
    population: string;
    avgTemp: string;
  };
  history: {
    title: string;
    body: string;
    sites: string[];
  };
  food: {
    title: string;
    items: string[];
    tags: Array<{ label: string; type?: string }>;
  };
  budget: {
    title: string;
    tiers: Array<{ label: string; pct: number; price: string }>;
    warning: string;
  };
  flights: {
    routes: Array<{ from: string; time: string; note: string }>;
    note: string;
  };
  neighbourhoods: {
    stay: string[];
    explore: string[];
  };
  intercity: {
    title: string;
    destinations: Array<{ city: string; detail: string }>;
  };
  gems: string[];
  customs: string[];
  photoSpots: string[];
  tips: Array<{ icon: string; text: string }>;
  carouselSearchTerms: string[];
};

const popular = ["Bangkok", "Tokyo", "Paris", "Bali", "Dubai", "Istanbul"];

function stripHtml(input: string) {
  return input.replace(/<[^>]*>/g, "");
}

function HalfStyledCity({ city }: { city: string }) {
  const mid = Math.floor(city.length / 2);
  return (
    <>
      {city.slice(0, mid)}
      <em className="text-[#E8B95A]">{city.slice(mid)}</em>
    </>
  );
}

export default function CityGuideClient() {
  const [city, setCity] = useState("");
  const [input, setInput] = useState("");
  const [guide, setGuide] = useState<LegacyGuide | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeSlide, setActiveSlide] = useState(0);

  const labelClass = "text-[11px] uppercase tracking-[0.18em] text-[#8C7B6A]";
  const titleClass = "text-2xl font-semibold leading-tight text-[#1A1208]";
  const bodyClass = "text-sm leading-7 text-[#7a6a5a]";

  useEffect(() => {
    if (photos.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % photos.length);
    }, 4500);
    return () => window.clearInterval(timer);
  }, [photos.length]);

  const themeVars = useMemo(
    () =>
      ({
        "--accent": guide?.accentColor || "#C9963A",
        "--accent-light": guide?.accentColorLight || "#E8B95A",
      }) as React.CSSProperties,
    [guide?.accentColor, guide?.accentColorLight]
  );

  async function loadCity(target: string) {
    const q = target.trim();
    if (!q) return;
    setLoading(true);
    setError("");

    try {
      const guideRes = await fetch("/api/city-guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ city: q }),
      });
      const guidePayload = (await guideRes.json()) as { error?: string; data?: LegacyGuide };
      if (!guideRes.ok || !guidePayload.data) throw new Error(guidePayload.error || "Failed to load city guide");

      const qTerms = guidePayload.data.carouselSearchTerms?.length
        ? guidePayload.data.carouselSearchTerms
        : [q, `${q} street`, `${q} food`, `${q} culture`, `${q} skyline`];

      const photoRes = await fetch("/api/city-photos", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ queries: qTerms.slice(0, 5) }),
      });
      const photoPayload = (await photoRes.json()) as { photos?: Array<string | null> };

      setCity(q);
      setGuide(guidePayload.data);
      setPhotos((photoPayload.photos || []).filter((p): p is string => !!p));
      setActiveSlide(0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load city guide");
      setGuide(null);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#FAF6EF]" style={themeVars}>
      <section className="bg-[#1A1208] px-4 py-16 md:px-10">
        <div className="mx-auto w-full max-w-5xl text-center">
          <p className="mb-5 text-[11px] uppercase tracking-[0.32em] text-[#E8B95A]">Day 05 / 75 Hard</p>
          <h1 className="mb-4 font-serif text-6xl leading-[0.9] text-white md:text-8xl">
            Every city.
            <br />
            <em className="text-[#E8B95A]">Instantly.</em>
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-sm text-white/60">
            Enter any city and get a full AI-generated bento travel guide with flights, budget, food,
            hidden gems, local customs, and practical tips.
          </p>
          <div className="mx-auto flex max-w-xl flex-col gap-2 rounded-2xl border border-white/20 bg-white/10 p-2 md:flex-row">
            <input
              className="w-full rounded-xl border border-white/15 bg-transparent px-4 py-3 text-white outline-none placeholder:text-white/40"
              placeholder="Bangkok, Tokyo, Paris…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && loadCity(input)}
            />
            <button
              onClick={() => loadCity(input)}
              disabled={loading}
              className="rounded-xl bg-[#C9963A] px-6 py-3 text-xs font-semibold uppercase tracking-[0.18em] text-white disabled:opacity-60"
            >
              {loading ? "Loading..." : "Explore"}
            </button>
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {popular.map((c) => (
              <button
                key={c}
                onClick={() => {
                  setInput(c);
                  loadCity(c);
                }}
                className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/75"
                disabled={loading}
              >
                {c}
              </button>
            ))}
          </div>
          {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        </div>
      </section>

      {guide ? (
        <section className="mx-auto w-full max-w-[1400px] px-3 py-4 md:px-5">
          <div className="mb-3 rounded-3xl bg-[#1A1208] px-6 py-8 md:px-10">
            <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#E8B95A]">City Guide</p>
            <h2 className="font-serif text-6xl leading-[0.9] text-white md:text-8xl">
              <HalfStyledCity city={city} />
            </h2>
            <p className="mt-3 text-sm text-white/60">{guide.hero.tagline}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              {guide.hero.pills.map((pill) => (
                <span
                  key={`${pill.emoji}-${pill.text}`}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs text-white/80"
                >
                  {pill.emoji} {pill.text}
                </span>
              ))}
            </div>
          </div>

          <div className="mb-3 overflow-hidden rounded-3xl border border-[#E8E0D0] bg-[#1A1208]">
            <div
              className="flex h-[320px] transition-transform duration-500"
              style={{ transform: `translateX(-${activeSlide * 100}%)` }}
            >
              {(photos.length ? photos : [null]).map((src, idx) => (
                <div key={idx} className="relative min-w-full">
                  {src ? (
                    <img src={src} alt={`${city} photo ${idx + 1}`} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-serif text-6xl italic text-white/20">
                      {city.toUpperCase()}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-2 py-3">
              {(photos.length ? photos : [null]).map((_, idx) => (
                <button
                  key={idx}
                  className={`h-2 w-2 rounded-full ${idx === activeSlide ? "bg-[#C9963A]" : "bg-white/30"}`}
                  onClick={() => setActiveSlide(idx)}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-12 auto-rows-auto gap-3 items-start">
            <article className="col-span-12 md:col-span-5 row-span-1 self-stretch h-full rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>City Vibe</p>
              <h3 className={titleClass}>{guide.vibe.title}</h3>
              <p className={`${bodyClass} mt-2`}>{stripHtml(guide.vibe.body)}</p>
            </article>

            <article className="col-span-12 md:col-span-3 row-span-1 self-stretch h-full rounded-2xl border border-[#E8E0D0] bg-[#1A1208] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Best Season</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{guide.bestTime.period}</h3>
              <p className="mt-2 text-sm leading-7 text-white/70">{stripHtml(guide.bestTime.note)}</p>
            </article>

            <article className="col-span-12 md:col-span-4 row-span-1 self-stretch h-full bg-[#c0522a] border-[#c0522a] rounded-2xl p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Entry</p>
              <h3 className="mt-1 text-2xl font-semibold text-white">{guide.visa.title}</h3>
              <p className="mt-2 text-sm leading-7 text-white/80">{stripHtml(guide.visa.body)}</p>
            </article>

            <article className="col-span-12 md:col-span-3 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Population</p>
              <p className="text-5xl font-serif text-[var(--accent)]">{guide.stats.population}</p>
              <p className={`${labelClass} mt-5`}>Avg Temp</p>
              <p className="text-5xl font-serif text-[var(--accent)]">{guide.stats.avgTemp}</p>
            </article>

            <article className="col-span-12 md:col-span-9 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>History</p>
              <h3 className={titleClass}>{guide.history.title}</h3>
              <p className={`${bodyClass} mt-2`}>{stripHtml(guide.history.body)}</p>
            </article>

            <article className="col-span-12 md:col-span-5 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Food & Drink</p>
              <h3 className={titleClass}>{guide.food.title}</h3>
              <ul className={`${bodyClass} mt-2 list-disc pl-5`}>
                {guide.food.items.slice(0, 5).map((item) => (
                  <li key={item}>{stripHtml(item)}</li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 md:col-span-7 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Daily Budget</p>
              <h3 className={titleClass}>{guide.budget.title}</h3>
              <div className="mt-3 space-y-3">
                {guide.budget.tiers.map((tier) => (
                  <div key={tier.label} className="grid grid-cols-[70px_1fr_auto] items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.16em] text-[#8C7B6A]">{tier.label}</span>
                    <div className="h-1.5 rounded bg-[#E8E0D0]">
                      <div className="h-full rounded bg-[var(--accent)]" style={{ width: `${tier.pct}%` }} />
                    </div>
                    <span className="text-base font-medium text-[#1A1208]">{tier.price}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="col-span-12 md:col-span-6 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Flights from India</p>
              <h3 className={titleClass}>Flight Times</h3>
              <ul className="mt-2 space-y-2">
                {guide.flights.routes.map((r) => (
                  <li key={r.from} className="flex items-center justify-between gap-3 border-b border-[#E8E0D0] pb-2 text-sm last:border-b-0">
                    <span className="text-lg font-medium text-[#1A1208]">{r.from}</span>
                    <span className="text-[#7a6a5a]">{r.time}</span>
                  </li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 md:col-span-6 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Neighbourhoods</p>
              <h3 className={titleClass}>Stay vs Explore</h3>
              <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-[#8C7B6A]">Stay</p>
              <ul className={`${bodyClass} list-disc pl-5`}>
                {guide.neighbourhoods.stay.map((s) => (
                  <li key={s}>{stripHtml(s)}</li>
                ))}
              </ul>
              <p className="mt-3 text-[11px] uppercase tracking-[0.16em] text-[#8C7B6A]">Explore</p>
              <ul className={`${bodyClass} list-disc pl-5`}>
                {guide.neighbourhoods.explore.map((s) => (
                  <li key={s}>{stripHtml(s)}</li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 md:col-span-7 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Inter-City</p>
              <h3 className={titleClass}>{guide.intercity.title}</h3>
              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {guide.intercity.destinations.map((d) => (
                  <div key={`${d.city}-${d.detail}`} className="rounded-xl bg-[#F8F3EA] p-3">
                    <p className="text-lg font-medium text-[#1A1208]">{d.city}</p>
                    <p className={`${bodyClass}`}>{d.detail}</p>
                  </div>
                ))}
              </div>
            </article>

            <article className="col-span-12 md:col-span-5 row-span-1 rounded-2xl border border-[#E8E0D0] bg-[#1A1208] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Hidden Gems</p>
              <h3 className="text-2xl font-semibold text-white">What Tourists Miss</h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-7 text-white/75">
                {guide.gems.map((g) => (
                  <li key={g}>{stripHtml(g)}</li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 md:col-span-4 row-span-1 rounded-2xl border border-[#E8E0D0] bg-white p-5">
              <p className={labelClass}>Customs</p>
              <h3 className={titleClass}>Do&apos;s & Don&apos;ts</h3>
              <ul className={`${bodyClass} mt-2 list-disc pl-5`}>
                {guide.customs.map((c) => (
                  <li key={c}>{stripHtml(c)}</li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 md:col-span-8 row-span-1 rounded-2xl border border-[#E8E0D0] bg-[#1C2B1E] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Photo Spots</p>
              <h3 className="text-2xl font-semibold text-white">Where to Shoot</h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-7 text-white/75">
                {guide.photoSpots.map((s) => (
                  <li key={s}>{stripHtml(s)}</li>
                ))}
              </ul>
            </article>

            <article className="col-span-12 row-span-1 rounded-2xl border border-[#E8E0D0] bg-[#1A1208] p-5">
              <p className="text-[11px] uppercase tracking-[0.18em] text-white/60">Practical Tips</p>
              <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-4">
                {guide.tips.map((t) => (
                  <div key={`${t.icon}-${t.text}`} className="rounded-xl bg-white/5 p-3">
                    <p className="mb-1 text-2xl">{t.icon}</p>
                    <p className="text-sm leading-7 text-white/80">{stripHtml(t.text)}</p>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : null}
    </main>
  );
}
