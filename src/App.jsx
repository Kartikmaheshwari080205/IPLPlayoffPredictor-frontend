import React, { useEffect, useMemo, useState } from "react";

const TEAM_ORDER_FALLBACK = ["MI", "CSK", "RCB", "KKR", "RR", "DC", "PBKS", "SRH", "GT", "LSG"];

const TEAM_LOGO_URLS = {
  MI: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860053/mumbai-indians.jpg",
  CSK: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860038/chennai-super-kings.jpg",
  RCB: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860056/royal-challengers-bengaluru.jpg",
  KKR: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860046/kolkata-knight-riders.jpg",
  RR: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860055/rajasthan-royals.jpg",
  DC: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860040/delhi-capitals.jpg",
  PBKS: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860084/punjab-kings.jpg",
  SRH: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860066/sunrisers-hyderabad.jpg",
  GT: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c860068/gujarat-titans.jpg",
  LSG: "https://static.cricbuzz.com/a/img/v1/0x0/i1/c882545/lucknow-super-giants.jpg",
};

const bundledSnapshotUrls = import.meta.glob("./data/playoff_snapshot.json", {
  eager: true,
  query: "?url",
  import: "default",
});

const bundledSnapshotUrl = Object.values(bundledSnapshotUrls)[0];

export default function App() {
  const [snapshot, setSnapshot] = useState({
    status: "missing",
    lastUpdated: "Loading...",
    remainingMatches: "-",
    teamOrder: TEAM_ORDER_FALLBACK,
    rows: [],
    message: "Loading snapshot...",
  });

  useEffect(() => {
    let cancelled = false;

    loadSnapshot().then((nextSnapshot) => {
      if (!cancelled) {
        setSnapshot(nextSnapshot);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const isComputed = snapshot.status === "computed";
  const stateLabel =
    snapshot.status === "computed"
      ? "Computed"
      : snapshot.status === "unfeasible"
        ? "Unfeasible"
        : "Missing Data";

  const metaCards = useMemo(
    () => [
      { label: "Last Updated", value: String(snapshot.lastUpdated) },
      { label: "Remaining Matches", value: String(snapshot.remainingMatches) },
      { label: "Teams", value: String(snapshot.teamOrder.length) },
    ],
    [snapshot.lastUpdated, snapshot.remainingMatches, snapshot.teamOrder.length]
  );

  return (
    <>
      <div className="bg-orb bg-orb-a" aria-hidden="true" />
      <div className="bg-orb bg-orb-b" aria-hidden="true" />

      <main className="app-shell">
        <header className="hero">
          <p className="eyebrow">IPL 2026</p>
          <h1>Playoff Probability Snapshot</h1>
          <p className="subtitle">
            Nightly backend snapshots are rendered here with computed and fallback states.
          </p>
        </header>

        <section className="meta" aria-label="Snapshot metadata">
          {metaCards.map((item) => (
            <article className="meta-card" key={item.label}>
              <p className="meta-label">{item.label}</p>
              <p className="meta-value">{item.value}</p>
            </article>
          ))}
        </section>

        <section className="state" aria-live="polite">
          <div className={`status-pill ${snapshot.status}`}>{stateLabel}</div>
          <h2>{isComputed ? "Team Playoff Chances" : "Snapshot State"}</h2>

          {isComputed ? (
            <table className="prob-table">
              <thead>
                <tr>
                  <th>Team</th>
                  <th>Probability</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {snapshot.rows.map(({ team, probability }) => {
                  const pct = clamp(probability, 0, 100);
                  const logoUrl = TEAM_LOGO_URLS[team];
                  return (
                    <tr key={team}>
                      <td>
                        <div className="team-cell">
                          {logoUrl ? (
                            <img
                              className="team-logo"
                              src={logoUrl}
                              alt={`${team} logo`}
                              loading="lazy"
                              referrerPolicy="no-referrer"
                            />
                          ) : null}
                          <span className="team-code">{team}</span>
                        </div>
                      </td>
                      <td>
                        <div className="bar-track">
                          <div className="bar-fill" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td>{pct.toFixed(2)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="message">{snapshot.message}</p>
          )}
        </section>
      </main>
    </>
  );
}

async function loadSnapshot() {
  const primaryPath = "/src/data/playoff_snapshot.json";

  const primary = await fetchJson(primaryPath);
  if (primary.ok) {
    return normalizeSnapshot(primary.data);
  }

  if (bundledSnapshotUrl) {
    const bundled = await fetchJson(String(bundledSnapshotUrl));
    if (bundled.ok) {
      return normalizeSnapshot(bundled.data);
    }
  }

  return {
    status: "missing",
    lastUpdated: "Unavailable",
    remainingMatches: "-",
    teamOrder: TEAM_ORDER_FALLBACK,
    rows: [],
    message:
      "Snapshot file is not available yet. This is expected on first deploy before the nightly publish workflow runs.",
  };
}

async function fetchJson(url) {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return { ok: false, data: null };
    }

    return { ok: true, data: await response.json() };
  } catch {
    return { ok: false, data: null };
  }
}

function normalizeSnapshot(raw) {
  const status = raw?.status === "computed" || raw?.status === "unfeasible" ? raw.status : "unfeasible";
  const teamOrder = Array.isArray(raw?.teamOrder) && raw.teamOrder.length ? raw.teamOrder : TEAM_ORDER_FALLBACK;

  let rows = [];
  if (status === "computed") {
    if (raw?.mappedProbabilities && typeof raw.mappedProbabilities === "object") {
      rows = teamOrder.map((team) => ({
        team,
        probability: numberOrZero(raw.mappedProbabilities[team]),
      }));
    } else if (Array.isArray(raw?.probabilities)) {
      rows = teamOrder.map((team, idx) => ({
        team,
        probability: numberOrZero(raw.probabilities[idx]),
      }));
    }

    rows = normalizeToPercentage(rows);
  }

  return {
    status,
    lastUpdated: raw?.lastUpdated || "Unavailable",
    remainingMatches: Number.isFinite(raw?.remainingMatches) ? raw.remainingMatches : "-",
    teamOrder,
    rows,
    message: status === "unfeasible" ? raw?.message || "unfeasible to compute at the moment" : "",
  };
}

function normalizeToPercentage(rows) {
  if (!rows.length) {
    return rows;
  }

  const maxValue = Math.max(...rows.map((row) => row.probability));
  if (maxValue <= 1) {
    return rows.map((row) => ({
      ...row,
      probability: row.probability * 100,
    }));
  }

  return rows;
}

function numberOrZero(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
