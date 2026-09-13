import React, { useMemo, useState } from "react";

const TRAINS = {
  Dhaka: {
    Intercity: [
      { id: "mohanagar", name: "Mohanagar Express", cost: 470, arrival: "4:00 AM" },
      { id: "coxexpress", name: "Cox's Bazar Express", cost: 500, arrival: "4:00 AM" },
      { id: "turna", name: "Turna Express", cost: 470, arrival: "5:30 AM" },
    ],
    Mail: [
      { id: "ctgmail", name: "Chattogram Mail", cost: 130, arrival: "8:00 AM" },
    ],
  },
  Kishoreganj: {
    Direct: [
      { id: "bijoy", name: "Bijoy Express", cost: 400, arrival: "5:30 AM" },
    ],
  },
};

const fmt = (n) => `৳${n.toLocaleString("en-BD")}`;

function legToChakaria(departure, mode) {
  if (departure === "Dhaka" && mode === "Mail") {
    return { name: "Local bus", cost: 200 };
  }
  return { name: "Shaikat Express", cost: 180 };
}

// Highest gateway tier reached, used to price Bandarban / Cox's Bazar.
// Priority: Thanchi > Alikadam > Lama.
function highestTier(sel) {
  if (sel.thanchi) return "thanchi";
  if (sel.alikadam) return "alikadam";
  if (sel.lama) return "lama";
  return null;
}
const TIER_NAME = { lama: "Lama", alikadam: "Alikadam", thanchi: "Thanchi" };

function dedupe(arr) {
  return arr.filter((v, i) => arr.indexOf(v) === i);
}

// Builds the day-by-day plan: which nights are spent where (travel/overnight-train
// nights are never counted here, only actual stays), and what each day covers.
function buildPlan(sel, remakri, bandarban, deboatkhum, coxsbazar, tier, plan2Night) {
  const core12 = [sel.lama && "Lama", sel.alikadam && "Alikadam"].filter(Boolean);
  const core123 = [sel.lama && "Lama", sel.alikadam && "Alikadam", sel.thanchi && "Thanchi"].filter(Boolean);
  const hub12 = sel.alikadam ? "Alikadam" : sel.lama ? "Lama" : null;
  const hub123 = tier ? TIER_NAME[tier] : null;

  if (bandarban) {
    const lastDay = {
      label: deboatkhum ? "Deboatkhum - Bandarban" : "Bandarban",
      desc: deboatkhum
        ? "Morning to noon at Deboatkhum, afternoon to evening around Bandarban, then the overnight train back to Dhaka."
        : "Bandarban sightseeing, then the overnight train back to Dhaka.",
      isReturnDay: true,
    };
    if (remakri) {
      return {
        nights: [{ location: "Thanchi" }, { location: "Bandarban" }],
        days: [
          { label: dedupe([...core123, "Thanchi"]).join(" - "), desc: "Visit your selected gateway towns, night stay at Thanchi." },
          { label: "Remakri - Bandarban", desc: "Morning at Remakri, afternoon journey on to Bandarban, night stay at Bandarban." },
          lastDay,
        ],
      };
    }
    return {
      nights: [{ location: "Bandarban" }],
      days: [
        { label: dedupe([...core123, "Bandarban"]).join(" - "), desc: "Visit your selected gateway towns, evening journey on to Bandarban." },
        lastDay,
      ],
    };
  }

  if (coxsbazar) {
    if (remakri) {
      return {
        nights: [{ location: "Thanchi" }, { location: "Cox's Bazar" }],
        days: [
          { label: dedupe([...core123, "Thanchi"]).join(" - "), desc: "Visit your selected gateway towns, night stay at Thanchi." },
          { label: "Remakri - Cox's Bazar", desc: "Morning at Remakri, afternoon journey on to Cox's Bazar, night stay there." },
          { label: "Cox's Bazar", desc: "Cox's Bazar sightseeing, then the overnight train back to Dhaka.", isReturnDay: true },
        ],
      };
    }
    return {
      nights: [{ location: hub123 }],
      days: [
        { label: dedupe([...core123, hub123]).join(" - "), desc: `Visit your selected gateway towns, night stay at ${hub123}.` },
        { label: "Cox's Bazar", desc: "Journey to Cox's Bazar, sightseeing, then the overnight train back to Dhaka.", isReturnDay: true },
      ],
    };
  }

  if (sel.thanchi) {
    if (remakri) {
      return {
        nights: [{ location: "Thanchi" }],
        days: [
          { label: dedupe([...core12, "Thanchi"]).join(" - "), desc: "Visit your selected gateway towns, night stay at Thanchi." },
          { label: "Remakri - Thanchi", desc: "Remakri and Thanchi sightseeing, then the overnight train back to Dhaka.", isReturnDay: true },
        ],
      };
    }
    return {
      nights: [{ location: plan2Night }],
      days: [
        { label: dedupe([...core12, plan2Night]).join(" - "), desc: `Visit your selected gateway towns, night stay at ${plan2Night}.` },
        { label: "Thanchi", desc: "Thanchi sightseeing, then the overnight train back to Dhaka.", isReturnDay: true },
      ],
    };
  }

  if (sel.lama || sel.alikadam) {
    return {
      nights: [{ location: hub12 }],
      days: [
        { label: dedupe([...core12, hub12]).join(" - "), desc: `Visit your selected gateway towns, night stay at ${hub12}.` },
        { label: hub12, desc: `${hub12} sightseeing, then the overnight train back to Dhaka.`, isReturnDay: true },
      ],
    };
  }

  return { nights: [], days: [] };
}

function resolveCost(pick) {
  if (!pick || pick.preset == null) return 0;
  if (pick.preset === "custom") return Number(pick.custom) || 0;
  return Number(pick.preset) || 0;
}

// A row of quick-pick amount buttons with a "Custom" fallback that reveals a
// manual number field. Used for night stays, daily food, and misc costs.
function CostPicker({ presets, pick, onPick, onCustom }) {
  const active = pick && pick.preset != null ? String(pick.preset) : null;
  return (
    <div>
      <div className="pill-row">
        {presets.map((p) => (
          <button
            key={p}
            type="button"
            className={`pill ${active === String(p) ? "active" : ""}`}
            onClick={() => onPick(p)}
          >
            {p === "custom" ? "Custom" : fmt(p)}
          </button>
        ))}
      </div>
      {active === "custom" && (
        <div className="custom-amount">
          <Counter value={(pick && pick.custom) || 0} onChange={onCustom} min={0} step={1} />
        </div>
      )}
    </div>
  );
}

// Modern +/- counter, increments/decrements by `step` (default 1). Used for
// custom cost amounts and the traveler count.
function Counter({ value, onChange, min = 0, step = 1 }) {
  const v = Number(value) || 0;
  return (
    <div className="counter">
      <button type="button" onClick={() => onChange(Math.max(min, v - step))}>−</button>
      <input
        type="number"
        className="counter-value"
        min={min}
        value={v === 0 ? "" : v}
        placeholder="0"
        onChange={(e) => onChange(Math.max(min, Number(e.target.value) || 0))}
      />
      <button type="button" onClick={() => onChange(v + step)}>+</button>
    </div>
  );
}

export default function TravelPlanner() {
  const [theme, setTheme] = useState("light");
  const [departure, setDeparture] = useState("Dhaka");
  const [mode, setMode] = useState("Intercity");
  const [trainId, setTrainId] = useState("mohanagar");

  const [sel, setSel] = useState({ lama: false, alikadam: false, thanchi: false });
  const [remakri, setRemakri] = useState(false);
  const [bandarban, setBandarban] = useState(false);
  const [deboatkhum, setDeboatkhum] = useState(false);
  const [coxsbazar, setCoxsbazar] = useState(false);

  const [nightPicks, setNightPicks] = useState({});
  const [foodPicks, setFoodPicks] = useState({});
  const [miscPick, setMiscPick] = useState(null);
  const [plan2Night, setPlan2Night] = useState("Thanchi");
  const [travelers, setTravelers] = useState(1);
  const [returnMode, setReturnMode] = useState("Intercity");
  const [dark, setDark] = useState(false);

  const trainOptions =
    departure === "Dhaka" ? TRAINS.Dhaka[mode] : TRAINS.Kishoreganj.Direct;

  const selectedTrain = trainOptions.find((t) => t.id === trainId) || trainOptions[0];
  const leg2 = legToChakaria(departure, mode);
  const tier = highestTier(sel);

  function chooseDeparture(next) {
    setDeparture(next);
    if (next === "Kishoreganj") {
      setTrainId("bijoy");
    } else {
      setMode("Intercity");
      setTrainId("mohanagar");
    }
  }

  function chooseMode(next) {
    setMode(next);
    setTrainId(TRAINS.Dhaka[next][0].id);
  }

  function toggleGateway(key) {
    setSel((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === "thanchi" && prev.thanchi && remakri) {
        setRemakri(false);
      }
      return next;
    });
  }

  function toggleRemakri() {
    const next = !remakri;
    setRemakri(next);
    if (next && !sel.thanchi) {
      setSel((prev) => ({ ...prev, thanchi: true }));
    }
  }

  function toggleBandarban() {
    const next = !bandarban;
    setBandarban(next);
    if (next) setCoxsbazar(false);
    if (!next) setDeboatkhum(false);
  }

  function toggleCoxsbazar() {
    setCoxsbazar((v) => !v);
  }

  function toggleDeboatkhum() {
    setDeboatkhum((v) => !v);
  }

  const arrivalAtChakaria =
    departure === "Dhaka" && mode === "Mail" ? "11:30 AM (mail train + bus)" : "9:00 AM";

  const planResult = useMemo(
    () => buildPlan(sel, remakri, bandarban, deboatkhum, coxsbazar, tier, plan2Night),
    [sel, remakri, bandarban, deboatkhum, coxsbazar, tier, plan2Night]
  );
  const nightsList = planResult.nights;
  const daysList = planResult.days;

  function pickNight(i, preset) {
    setNightPicks((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), preset } }));
  }
  function customNight(i, val) {
    setNightPicks((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), custom: val } }));
  }
  function pickFood(i, preset) {
    setFoodPicks((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), preset } }));
  }
  function customFood(i, val) {
    setFoodPicks((prev) => ({ ...prev, [i]: { ...(prev[i] || {}), custom: val } }));
  }
  function pickMisc(preset) {
    setMiscPick((prev) => ({ ...(prev || {}), preset }));
  }
  function customMisc(val) {
    setMiscPick((prev) => ({ ...(prev || {}), custom: val }));
  }

  const destinationBreakdown = useMemo(() => {
    const rows = [];
    if (sel.lama) rows.push({ label: "Chakaria → Lama", cost: 200 });
    if (sel.alikadam) rows.push({ label: "Chakaria → Alikadam", cost: 300 });
    if (sel.thanchi) {
      const thanchiCost = sel.alikadam ? 300 : 500;
      rows.push({
        label: `Chakaria → Thanchi${sel.alikadam ? " (via Alikadam)" : ""}`,
        cost: thanchiCost,
      });
    }
    if (remakri) {
      rows.push({ label: "Thanchi → Remakri", cost: 1500 });
    }
    if (bandarban && tier) {
      const cost = tier === "thanchi" ? 1000 : tier === "alikadam" ? 1150 : 1250;
      rows.push({ label: `${TIER_NAME[tier]} → Bandarban`, cost });
    }
    if (bandarban && deboatkhum) {
      rows.push({ label: "Bandarban → Deboatkhum", cost: 500 });
    }
    if (!bandarban && coxsbazar && tier) {
      const base = tier === "thanchi" ? 350 : 200;
      rows.push({ label: `${TIER_NAME[tier]} → Cox's Bazar`, cost: base });
      rows.push({ label: "Cox's Bazar surcharge", cost: 400 });
    }
    return rows;
  }, [sel, remakri, bandarban, deboatkhum, coxsbazar, tier]);

  const destinationTotal = destinationBreakdown.reduce((s, r) => s + r.cost, 0);

  // Return fare to Dhaka: tier is priced off the furthest/most-notable stop in
  // the trip (Cox's Bazar > Bandarban > Thanchi > Lama/Alikadam only), and each
  // tier offers an Intercity or a Mail Train option for the Chattogram-Dhaka leg.
  const returnTier = coxsbazar
    ? "coxsbazar"
    : bandarban
    ? "bandarban"
    : sel.thanchi
    ? "thanchi"
    : sel.lama || sel.alikadam
    ? "lama_alikadam"
    : null;

  const RETURN_FARES = {
    coxsbazar: { Intercity: 775, Mail: 400 },
    bandarban: { Intercity: 800, Mail: 450 },
    thanchi: { Intercity: 1000, Mail: 650 },
    lama_alikadam: { Intercity: 850, Mail: 500 },
  };
  const RETURN_LEG = {
    coxsbazar: {
      Intercity: "Cox's Bazar Express, straight through",
      Mail: "Cox's Bazar Express to Chattogram, then Chattogram Mail to Dhaka",
    },
    bandarban: {
      Intercity: "Bus to Chattogram, then Turna Express to Dhaka",
      Mail: "Bus to Chattogram, then Chattogram Mail to Dhaka",
    },
    thanchi: {
      Intercity: "Local bus to Chattogram, then Turna Express to Dhaka",
      Mail: "Local bus to Chattogram, then Chattogram Mail to Dhaka",
    },
    lama_alikadam: {
      Intercity: "Local bus to Chattogram, then Turna Express to Dhaka",
      Mail: "Local bus to Chattogram, then Chattogram Mail to Dhaka",
    },
  };

  const returnFare = returnTier ? RETURN_FARES[returnTier][returnMode] : 0;
  const returnLabel = returnTier ? RETURN_LEG[returnTier][returnMode] : null;

  const transportTotal = selectedTrain.cost + leg2.cost + destinationTotal + returnFare;
  const stayTotal = nightsList.reduce((s, _, i) => s + resolveCost(nightPicks[i]), 0);
  const foodTotal = daysList.reduce((s, _, i) => s + resolveCost(foodPicks[i]), 0);
  const miscTotal = resolveCost(miscPick);
  const perPersonTotal = transportTotal + stayTotal + foodTotal + miscTotal;
  const groupTotal = perPersonTotal * Math.max(1, travelers);

  const anyGatewayChosen = !!tier;
  const canPickBandarban = anyGatewayChosen;
  const canPickDeboatkhum = bandarban;
  const canPickCoxsbazar = anyGatewayChosen && !bandarban;

  const routeLabel = tier
    ? [sel.lama && "Lama", sel.alikadam && "Alikadam", sel.thanchi && "Thanchi"]
        .filter(Boolean)
        .join(" + ")
    : "Chattogram";

  return (
    <div className={`app ${dark ? "dark" : ""}`}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');

        .app {
          --bg: #f8ede6;
          --panel: rgba(255,255,255,0.55);
          --panel-2: rgba(255,255,255,0.4);
          --panel-3: rgba(255,255,255,0.75);
          --paper: #fffaf3;
          --ink: #2b1620;
          --cream: #33202b;
          --brass: #b3195e;
          --brass-bright: #d6408f;
          --brick: #7a1338;
          --sage: #8a6673;
          --line: rgba(179,25,94,0.18);
          font-family: 'Inter', system-ui, sans-serif;
          font-size: 19px;
          background: var(--bg);
          background-image:
            radial-gradient(circle at 12% 8%, rgba(214,64,143,0.16), transparent 42%),
            radial-gradient(circle at 88% 18%, rgba(255,214,180,0.5), transparent 45%),
            radial-gradient(circle at 30% 95%, rgba(179,25,94,0.1), transparent 50%);
          background-attachment: fixed;
          color: var(--cream);
          padding: 2.75rem 1.5rem 5rem;
          min-height: 100%;
          box-sizing: border-box;
        }
        .app *, .app *::before, .app *::after { box-sizing: border-box; }

        .shell {
          max-width: 1120px;
          margin: 0 auto;
        }

        .masthead {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 2.4rem;
          border-bottom: 1px solid var(--line);
          padding-bottom: 1.6rem;
        }
        .masthead .eyebrow {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 0.85rem;
          letter-spacing: 0.06em;
          color: var(--brass);
          font-weight: 700;
        }
        .masthead h1 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: clamp(2.1rem, 3.8vw, 3rem);
          margin: 0;
          color: var(--cream);
          line-height: 1.12;
        }
        .masthead p {
          margin: 0.2rem 0 0;
          color: var(--sage);
          max-width: 50ch;
          font-size: 1.08rem;
          line-height: 1.5;
        }

        .layout {
          display: grid;
          grid-template-columns: minmax(0,1fr) 380px;
          gap: 2.2rem;
          align-items: start;
        }
        @media (max-width: 900px) {
          .layout { grid-template-columns: 1fr; }
        }

        .rail-steps {
          display: flex;
          flex-direction: column;
          gap: 1.6rem;
        }

        .step {
          position: relative;
          display: grid;
          grid-template-columns: 30px 1fr;
          gap: 1rem;
        }
        .step-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        .step-dot {
          width: 13px;
          height: 13px;
          border-radius: 50%;
          background: var(--brass);
          margin-top: 8px;
          flex-shrink: 0;
          box-shadow: 0 0 0 4px rgba(179,25,94,0.18);
        }
        .step-dot.muted { background: var(--sage); opacity: 0.55; box-shadow: none; }
        .step-thread {
          flex: 1;
          width: 1px;
          background: var(--line);
          margin-top: 6px;
        }

        .card {
          background: var(--panel);
          backdrop-filter: blur(22px) saturate(180%);
          -webkit-backdrop-filter: blur(22px) saturate(180%);
          border: 1px solid rgba(255,255,255,0.65);
          border-radius: 18px;
          padding: 1.6rem 1.7rem 1.7rem;
          box-shadow: 0 12px 32px -12px rgba(122,19,56,0.22), inset 0 1px 0 rgba(255,255,255,0.6);
          transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        .card h2 {
          font-family: 'Fraunces', serif;
          font-weight: 600;
          font-size: 1.4rem;
          margin: 0 0 0.3rem;
          color: var(--cream);
        }
        .card .hint {
          font-size: 0.98rem;
          color: var(--sage);
          margin: 0 0 1.05rem;
          line-height: 1.5;
        }

        .pill-row {
          display: flex;
          flex-wrap: wrap;
          gap: 0.6rem;
        }
        .pill {
          font-family: 'Inter', sans-serif;
          font-size: 1rem;
          font-weight: 500;
          padding: 0.6rem 1.1rem;
          border-radius: 999px;
          border: 1px solid var(--line);
          background: var(--panel-2);
          backdrop-filter: blur(10px);
          color: var(--cream);
          cursor: pointer;
          transition: border-color 0.15s ease, background 0.15s ease, transform 0.1s ease;
        }
        .pill:hover { border-color: var(--brass); transform: translateY(-1px); }
        .pill:active { transform: translateY(0); }
        .pill.active {
          background: var(--brass);
          border-color: var(--brass);
          color: #fff5f9;
          font-weight: 700;
          box-shadow: 0 6px 16px -8px rgba(179,25,94,0.6);
        }
        .pill:focus-visible { outline: 2px solid var(--brass-bright); outline-offset: 2px; }

        .option-list {
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .option {
          display: grid;
          grid-template-columns: 20px 1fr auto;
          align-items: center;
          gap: 0.8rem;
          padding: 0.85rem 1rem;
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          cursor: pointer;
          background: var(--panel-2);
          backdrop-filter: blur(12px);
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .option:hover { border-color: rgba(179,25,94,0.4); }
        .option.selected { border-color: var(--brass); background: var(--panel-3); }
        .option.disabled {
          opacity: 0.42;
          cursor: not-allowed;
        }
        .option input { accent-color: var(--brass); width: 18px; height: 18px; }
        .option .name { font-size: 1.1rem; font-weight: 500; }
        .option .meta { font-size: 0.88rem; color: var(--sage); display: block; margin-top: 0.15rem; line-height: 1.4; }
        .option .day-desc {
          font-size: 1.02rem;
          color: var(--cream);
          opacity: 0.82;
          display: block;
          margin-top: 0.3rem;
          line-height: 1.55;
          font-weight: 450;
        }
        .option .cost {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1rem;
          color: var(--brass);
          font-weight: 700;
        }
        .option .why-not {
          grid-column: 2 / span 2;
          font-size: 0.85rem;
          color: var(--sage);
          margin-top: 0.2rem;
        }

        .field-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }
        .field label {
          display: block;
          font-size: 0.9rem;
          color: var(--sage);
          margin-bottom: 0.4rem;
        }
        .field .unit-input {
          display: flex;
          align-items: center;
          border: 1px solid var(--line);
          border-radius: 10px;
          background: var(--panel-2);
          overflow: hidden;
          transition: border-color 0.15s ease;
        }
        .field .unit-input span {
          padding: 0 0.7rem;
          font-family: 'IBM Plex Mono', monospace;
          color: var(--sage);
          font-size: 0.95rem;
        }
        .field input {
          width: 100%;
          border: none;
          background: transparent;
          color: var(--cream);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.02rem;
          padding: 0.7rem 0.7rem 0.7rem 0;
        }
        .field input:focus { outline: none; }
        .field .unit-input:focus-within { border-color: var(--brass); }

        .cost-block {
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          padding: 1rem 1.1rem;
          background: var(--panel-2);
          backdrop-filter: blur(12px);
        }
        .cost-block + .cost-block { margin-top: 0.8rem; }
        .cost-block .cost-label {
          font-size: 1.05rem;
          font-weight: 500;
          margin-bottom: 0.2rem;
        }
        .cost-block .cost-meta {
          font-size: 0.88rem;
          color: var(--sage);
          margin-bottom: 0.7rem;
          line-height: 1.4;
        }
        .custom-amount {
          margin-top: 0.7rem;
          max-width: 200px;
        }

        .note {
          font-size: 0.92rem;
          color: var(--sage);
          margin-top: 0.9rem;
          line-height: 1.55;
        }

        .ticket {
          position: sticky;
          top: 1.75rem;
          background: var(--paper);
          color: var(--ink);
          border-radius: 16px;
          padding: 1.7rem 1.6rem;
          font-family: 'IBM Plex Mono', monospace;
          box-shadow: 0 18px 40px -20px rgba(122,19,56,0.35);
        }
        .ticket .t-head {
          font-family: 'Fraunces', serif;
          font-size: 1.2rem;
          font-weight: 600;
          margin: 0 0 0.2rem;
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.6rem;
        }
        .ticket .t-head span:last-child {
          font-size: 0.9rem;
          text-align: right;
        }
        .ticket .t-sub {
          font-size: 0.8rem;
          letter-spacing: 0.04em;
          color: #8a5c6a;
          margin-bottom: 1.05rem;
        }
        .ticket .perf {
          border-top: 1px dashed #d9b7c0;
          margin: 1.05rem 0;
        }
        .t-row {
          display: flex;
          justify-content: space-between;
          gap: 0.7rem;
          font-size: 0.94rem;
          padding: 0.32rem 0;
          line-height: 1.4;
        }
        .t-row .label { color: #5c3543; }
        .t-row .val { white-space: nowrap; font-weight: 500; }
        .t-section-title {
          font-size: 0.8rem;
          letter-spacing: 0.06em;
          color: #a5677a;
          margin-top: 0.8rem;
          margin-bottom: 0.2rem;
        }
        .t-total {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-top: 0.7rem;
          padding-top: 0.8rem;
          border-top: 1px solid #e6c7d0;
        }
        .t-total .label { font-family: 'Fraunces', serif; font-size: 1.08rem; color: var(--ink); }
        .t-total .val { font-size: 1.65rem; font-weight: 600; color: var(--brick); }
        .t-total.per-person .val { font-size: 1.12rem; color: #5c3543; }

        .counter {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--panel-2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.5);
          border-radius: 12px;
          padding: 0.3rem;
        }
        .counter button {
          width: 38px;
          height: 38px;
          border-radius: 9px;
          border: none;
          background: var(--panel-3);
          color: var(--cream);
          cursor: pointer;
          font-size: 1.2rem;
          line-height: 1;
          transition: background 0.15s ease, transform 0.1s ease, color 0.15s ease;
        }
        .counter button:hover { background: var(--brass); color: #fff5f9; }
        .counter button:active { transform: scale(0.94); }
        .counter-value {
          width: 4.2rem;
          text-align: center;
          background: transparent;
          border: none;
          color: var(--cream);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 1.08rem;
          -moz-appearance: textfield;
        }
        .counter-value::-webkit-outer-spin-button,
        .counter-value::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .counter-value:focus { outline: none; }
        .counter-value::placeholder { color: var(--sage); opacity: 0.7; }
        .custom-amount { margin-top: 0.8rem; }

        .app.dark {
          --bg: #1b1220;
          --panel: rgba(255,255,255,0.07);
          --panel-2: rgba(255,255,255,0.05);
          --panel-3: rgba(255,255,255,0.11);
          --cream: #f4e9ef;
          --brass: #e0559b;
          --brass-bright: #ff8fc4;
          --brick: #ff7a86;
          --sage: #c3a2b3;
          --line: rgba(255,255,255,0.14);
          background: var(--bg);
          background-image:
            radial-gradient(circle at 12% 8%, rgba(224,85,155,0.22), transparent 42%),
            radial-gradient(circle at 88% 18%, rgba(255,180,140,0.14), transparent 45%),
            radial-gradient(circle at 30% 95%, rgba(160,40,100,0.2), transparent 50%);
        }
        .app.dark .card {
          border-color: rgba(255,255,255,0.13);
          box-shadow: 0 12px 32px -12px rgba(0,0,0,0.55), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .app.dark .option,
        .app.dark .pill,
        .app.dark .counter {
          border-color: rgba(255,255,255,0.13);
        }
        .app.dark .pill.active { border-color: var(--brass); }
        .app.dark .step-dot { box-shadow: 0 0 0 4px rgba(224,85,155,0.28); }
        .app.dark .ticket { box-shadow: 0 18px 40px -18px rgba(0,0,0,0.6); }

        .masthead-top {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .theme-toggle {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--panel-2);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(255,255,255,0.5);
          padding: 0.55rem 1rem;
          border-radius: 999px;
          cursor: pointer;
          color: var(--cream);
          font-family: 'Inter', sans-serif;
          font-size: 0.92rem;
          font-weight: 500;
          transition: border-color 0.15s ease, transform 0.1s ease;
          flex-shrink: 0;
        }
        .theme-toggle:hover { border-color: var(--brass); transform: translateY(-1px); }
        .app.dark .theme-toggle { border-color: rgba(255,255,255,0.16); }
      `}</style>

      <div className="shell">
        <div className="masthead">
          <div className="masthead-top">
            <div>
              <span className="eyebrow">CHATTOGRAM HILL ROUTE PLANNER</span>
              <h1>Plan the road to the hills</h1>
              <p>Pick your departure, your train, and however many gateway towns you're routing through — the fare adds up as you go.</p>
            </div>
            <button
              type="button"
              className="theme-toggle"
              onClick={() => setDark((d) => !d)}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="4" />
                  <line x1="12" y1="2" x2="12" y2="4" />
                  <line x1="12" y1="20" x2="12" y2="22" />
                  <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                  <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                  <line x1="2" y1="12" x2="4" y2="12" />
                  <line x1="20" y1="12" x2="22" y2="12" />
                  <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                  <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              )}
              {dark ? "Light" : "Dark"}
            </button>
          </div>
        </div>

        <div className="layout">
          <div className="rail-steps">
            {/* Step 1: Departure */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot" />
                <div className="step-thread" />
              </div>
              <div className="card">
                <h2>1. Where are you leaving from?</h2>
                <p className="hint">This decides which trains are available to you.</p>
                <div className="pill-row">
                  {["Dhaka", "Kishoreganj"].map((d) => (
                    <button
                      key={d}
                      className={`pill ${departure === d ? "active" : ""}`}
                      onClick={() => chooseDeparture(d)}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 2: Mode + train */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot" />
                <div className="step-thread" />
              </div>
              <div className="card">
                <h2>2. Choose your train</h2>
                {departure === "Dhaka" ? (
                  <>
                    <p className="hint">Intercity is faster and pricier; the mail train is slow but cheap.</p>
                    <div className="pill-row" style={{ marginBottom: "1.05rem" }}>
                      {["Intercity", "Mail"].map((m) => (
                        <button
                          key={m}
                          className={`pill ${mode === m ? "active" : ""}`}
                          onClick={() => chooseMode(m)}
                        >
                          {m === "Mail" ? "Mail Train" : "Intercity Train"}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <p className="hint">Kishoreganj has one direct service to Chattogram.</p>
                )}
                <div className="option-list">
                  {trainOptions.map((t) => (
                    <label
                      key={t.id}
                      className={`option ${trainId === t.id ? "selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="train"
                        checked={trainId === t.id}
                        onChange={() => setTrainId(t.id)}
                      />
                      <span>
                        <span className="name">{t.name}</span>
                        <span className="meta">Reaches Chattogram ~{t.arrival}</span>
                      </span>
                      <span className="cost">{fmt(t.cost)}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            {/* Step 3: onward leg, automatic */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot muted" />
                <div className="step-thread" />
              </div>
              <div className="card">
                <h2>3. Chattogram → Chakaria</h2>
                <p className="hint">Set automatically by your train choice above.</p>
                <div className="option selected" style={{ cursor: "default" }}>
                  <span style={{ width: 20 }} />
                  <span>
                    <span className="name">{leg2.name}</span>
                    <span className="meta">
                      {departure === "Dhaka" && mode === "Mail"
                        ? "Mail-train arrivals connect onward by bus"
                        : "Connects onward by rail"}
                    </span>
                  </span>
                  <span className="cost">{fmt(leg2.cost)}</span>
                </div>
              </div>
            </div>

            {/* Step 4: destinations */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot" />
                <div className="step-thread" />
              </div>
              <div className="card">
                <h2>4. How far into the hills?</h2>
                <p className="hint">Pick any of the gateway towns — Thanchi gets cheaper once Alikadam is also on your route — then extend further if you like.</p>

                <div className="option-list" style={{ marginBottom: "1.1rem" }}>
                  <label className={`option ${sel.lama ? "selected" : ""}`}>
                    <input type="checkbox" checked={sel.lama} onChange={() => toggleGateway("lama")} />
                    <span className="name">Lama</span>
                    <span className="cost">{fmt(200)}</span>
                  </label>

                  <label className={`option ${sel.alikadam ? "selected" : ""}`}>
                    <input type="checkbox" checked={sel.alikadam} onChange={() => toggleGateway("alikadam")} />
                    <span className="name">Alikadam</span>
                    <span className="cost">{fmt(300)}</span>
                  </label>

                  <label className={`option ${sel.thanchi ? "selected" : ""}`}>
                    <input type="checkbox" checked={sel.thanchi} onChange={() => toggleGateway("thanchi")} />
                    <span>
                      <span className="name">Thanchi</span>
                      {sel.alikadam && <span className="meta">Cheaper via Alikadam</span>}
                    </span>
                    <span className="cost">{fmt(sel.alikadam ? 300 : 500)}</span>
                  </label>
                </div>

                <p className="hint" style={{ margin: "0 0 0.6rem" }}>Extend the route</p>
                <div className="option-list">
                  <label className={`option ${remakri ? "selected" : ""}`}>
                    <input type="checkbox" checked={remakri} onChange={toggleRemakri} />
                    <span>
                      <span className="name">Remakri</span>
                      <span className="meta">Auto-selects Thanchi if not already chosen; Thanchi's fare is charged separately</span>
                    </span>
                    <span className="cost">{fmt(1500)}</span>
                  </label>

                  <label className={`option ${bandarban ? "selected" : ""} ${!canPickBandarban ? "disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={bandarban}
                      disabled={!canPickBandarban}
                      onChange={toggleBandarban}
                    />
                    <span className="name">Bandarban</span>
                    <span className="cost">
                      {tier ? fmt(tier === "thanchi" ? 1000 : tier === "alikadam" ? 1150 : 1250) : "—"}
                    </span>
                    {!canPickBandarban && (
                      <span className="why-not">Choose a gateway town first</span>
                    )}
                  </label>

                  <label className={`option ${deboatkhum ? "selected" : ""} ${!canPickDeboatkhum ? "disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={deboatkhum}
                      disabled={!canPickDeboatkhum}
                      onChange={toggleDeboatkhum}
                    />
                    <span className="name">Deboatkhum</span>
                    <span className="cost">{fmt(500)}</span>
                    {!canPickDeboatkhum && (
                      <span className="why-not">Requires Bandarban</span>
                    )}
                  </label>

                  <label className={`option ${coxsbazar ? "selected" : ""} ${!canPickCoxsbazar ? "disabled" : ""}`}>
                    <input
                      type="checkbox"
                      checked={coxsbazar}
                      disabled={!canPickCoxsbazar}
                      onChange={toggleCoxsbazar}
                    />
                    <span>
                      <span className="name">Cox's Bazar</span>
                      <span className="meta">Not available together with Bandarban · includes a ৳400 surcharge</span>
                    </span>
                    <span className="cost">
                      {tier ? fmt((tier === "thanchi" ? 350 : 200) + 400) : "—"}
                    </span>
                  </label>
                </div>
              </div>
            </div>

            {/* Step 5: return trip */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot muted" />
                <div className="step-thread" />
              </div>
              <div className="card">
                <h2>5. Return to Dhaka</h2>
                <p className="hint">The tier is set automatically by the furthest stop on your trip; you choose the train class back.</p>
                {returnTier ? (
                  <>
                    <div className="pill-row" style={{ marginBottom: "1.05rem" }}>
                      {["Intercity", "Mail"].map((m) => (
                        <button
                          key={m}
                          className={`pill ${returnMode === m ? "active" : ""}`}
                          onClick={() => setReturnMode(m)}
                        >
                          {m === "Mail" ? "Mail Train" : "Intercity Train"}
                        </button>
                      ))}
                    </div>
                    <div className="option selected" style={{ cursor: "default" }}>
                      <span style={{ width: 20 }} />
                      <span>
                        <span className="name">Return fare</span>
                        <span className="meta">{returnLabel}</span>
                      </span>
                      <span className="cost">{fmt(returnFare)}</span>
                    </div>
                  </>
                ) : (
                  <p className="note" style={{ marginTop: 0 }}>
                    Pick a destination in step 4 to see return options.
                  </p>
                )}
              </div>
            </div>

            {/* Step 6: trip plan, stays & food */}
            <div className="step">
              <div className="step-marker">
                <div className="step-dot" />
              </div>
              <div className="card">
                <h2>6. Trip plan, stays &amp; food</h2>
                {daysList.length === 0 ? (
                  <p className="note" style={{ marginTop: 0 }}>
                    Pick a destination in step 4 to generate your day-by-day plan.
                  </p>
                ) : (
                  <>
                    <p className="hint">
                      Your plan, built from your step 4 picks — overnight journey down, arriving Chakaria ~{arrivalAtChakaria}.
                    </p>

                    {sel.thanchi && !remakri && !bandarban && !coxsbazar && (
                      <div className="pill-row" style={{ marginBottom: "1.05rem" }}>
                        {["Alikadam", "Thanchi"].map((loc) => (
                          <button
                            key={loc}
                            className={`pill ${plan2Night === loc ? "active" : ""}`}
                            onClick={() => setPlan2Night(loc)}
                          >
                            Night 1 at {loc}
                          </button>
                        ))}
                      </div>
                    )}

                    <div className="option-list" style={{ marginBottom: "1.3rem" }}>
                      {daysList.map((d, i) => (
                        <div className="option" key={i} style={{ cursor: "default", gridTemplateColumns: "1fr" }}>
                          <span>
                            <span className="name">
                              Day {i + 1}{d.isReturnDay ? " · return night" : ""} — {d.label}
                            </span>
                            <span className="day-desc">{d.desc}</span>
                          </span>
                        </div>
                      ))}
                    </div>

                    <p className="hint" style={{ margin: "0 0 0.7rem" }}>
                      Stays ({nightsList.length} night{nightsList.length === 1 ? "" : "s"})
                    </p>
                    {nightsList.map((n, i) => (
                      <div className="cost-block" key={i}>
                        <div className="cost-label">Night {i + 1} · {n.location}</div>
                        <CostPicker
                          presets={[400, 500, "custom"]}
                          pick={nightPicks[i]}
                          onPick={(p) => pickNight(i, p)}
                          onCustom={(v) => customNight(i, v)}
                        />
                      </div>
                    ))}

                    <p className="hint" style={{ margin: "1.2rem 0 0.7rem" }}>
                      Food ({daysList.length} day{daysList.length === 1 ? "" : "s"})
                    </p>
                    {daysList.map((d, i) => (
                      <div className="cost-block" key={i}>
                        <div className="cost-label">Day {i + 1} ({d.label})</div>
                        <div className="cost-meta">
                          3 meals — breakfast, lunch, dinner{d.isReturnDay ? " (dinner before departure)" : ""}
                        </div>
                        <CostPicker
                          presets={[350, 500, "custom"]}
                          pick={foodPicks[i]}
                          onPick={(p) => pickFood(i, p)}
                          onCustom={(v) => customFood(i, v)}
                        />
                      </div>
                    ))}

                    <p className="hint" style={{ margin: "1.2rem 0 0.7rem" }}>Miscellaneous</p>
                    <div className="cost-block">
                      <div className="cost-label">Guides, entry fees, extras</div>
                      <div className="cost-meta">Anything not already covered above.</div>
                      <CostPicker
                        presets={[500, "custom"]}
                        pick={miscPick}
                        onPick={pickMisc}
                        onCustom={customMisc}
                      />
                    </div>
                  </>
                )}

                <div className="field-grid" style={{ marginTop: "1.3rem" }}>
                  <div className="field">
                    <label>Travelers</label>
                    <Counter value={travelers} onChange={(v) => setTravelers(Math.max(1, v))} min={1} step={1} />
                  </div>
                </div>
                <p className="note">
                  Only nights actually spent somewhere are counted — the overnight train down and the overnight return aren't lodging nights, but meals on those travel days (including the return-night dinner) are still included above.
                </p>
              </div>
            </div>
          </div>

          {/* Ticket summary */}
          <div className="ticket">
            <div className="t-head">
              <span>Fare</span>
              <span>{departure === "Dhaka" ? "DHK" : "KIS"} → {routeLabel}</span>
            </div>
            <div className="t-sub">ROUND TRIP · PER PERSON UNLESS NOTED</div>

            <div className="t-section-title">TRANSPORT</div>
            <div className="t-row">
              <span className="label">{selectedTrain.name}</span>
              <span className="val">{fmt(selectedTrain.cost)}</span>
            </div>
            <div className="t-row">
              <span className="label">{leg2.name} (→ Chakaria)</span>
              <span className="val">{fmt(leg2.cost)}</span>
            </div>
            {destinationBreakdown.map((r, i) => (
              <div className="t-row" key={i}>
                <span className="label">{r.label}</span>
                <span className="val">{fmt(r.cost)}</span>
              </div>
            ))}
            {returnFare > 0 && (
              <div className="t-row">
                <span className="label">Return to Dhaka ({returnMode === "Mail" ? "mail" : "intercity"})</span>
                <span className="val">{fmt(returnFare)}</span>
              </div>
            )}

            {(stayTotal > 0 || foodTotal > 0 || miscTotal > 0) && (
              <>
                <div className="t-section-title">STAY, FOOD &amp; EXTRAS</div>
                {stayTotal > 0 && (
                  <div className="t-row">
                    <span className="label">Stay · {nightsList.length} night{nightsList.length === 1 ? "" : "s"}</span>
                    <span className="val">{fmt(stayTotal)}</span>
                  </div>
                )}
                {foodTotal > 0 && (
                  <div className="t-row">
                    <span className="label">Food · {daysList.length} day{daysList.length === 1 ? "" : "s"}</span>
                    <span className="val">{fmt(foodTotal)}</span>
                  </div>
                )}
                {miscTotal > 0 && (
                  <div className="t-row">
                    <span className="label">Miscellaneous</span>
                    <span className="val">{fmt(miscTotal)}</span>
                  </div>
                )}
              </>
            )}

            <div className="perf" />
            <div className="t-total">
              <span className="label">Per person</span>
              <span className="val">{fmt(perPersonTotal)}</span>
            </div>
            {travelers > 1 && (
              <div className="t-total per-person">
                <span className="label">× {travelers} travelers</span>
                <span className="val">{fmt(groupTotal)}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

