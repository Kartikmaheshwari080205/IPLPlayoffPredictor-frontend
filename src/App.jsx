import React, { useEffect, useMemo, useRef, useState } from "react";

const TEAM_ORDER_FALLBACK = ["MI", "CSK", "RCB", "KKR", "RR", "DC", "PBKS", "SRH", "GT", "LSG"];
const TAB_OPTIONS = [
  { id: "points", label: "Points Table" },
  { id: "playoffs", label: "Playoff Probability" },
  { id: "h2h", label: "H2H Record" },
];

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
    lastCompletedMatch: null,
    teamOrder: TEAM_ORDER_FALLBACK,
    rows: [],
    pointsTable: [],
    h2h: {
      teamOrder: TEAM_ORDER_FALLBACK,
      rows: [],
    },
    message: "Loading snapshot...",
  });
  const [activeTab, setActiveTab] = useState("points");
  const [selectedH2hTeam, setSelectedH2hTeam] = useState(TEAM_ORDER_FALLBACK[0]);
  const [isH2hMenuOpen, setIsH2hMenuOpen] = useState(false);
  const h2hDropdownRef = useRef(null);

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

  useEffect(() => {
    const availableTeams = snapshot.h2h.teamOrder;
    if (!availableTeams.length) {
      return;
    }

    if (!availableTeams.includes(selectedH2hTeam)) {
      setSelectedH2hTeam(availableTeams[0]);
    }
  }, [selectedH2hTeam, snapshot.h2h.teamOrder]);

  useEffect(() => {
    if (!isH2hMenuOpen) {
      return;
    }

    function handleDocumentPointerDown(event) {
      if (!h2hDropdownRef.current?.contains(event.target)) {
        setIsH2hMenuOpen(false);
      }
    }

    function handleEscape(event) {
      if (event.key === "Escape") {
        setIsH2hMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isH2hMenuOpen]);

  useEffect(() => {
    if (activeTab !== "h2h") {
      setIsH2hMenuOpen(false);
    }
  }, [activeTab]);

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
      { label: "Last Completed Match", value: formatLastCompletedMatch(snapshot.lastCompletedMatch) },
      { label: "Remaining Matches", value: String(snapshot.remainingMatches) },
      { label: "Teams", value: String(snapshot.teamOrder.length) },
    ],
    [snapshot.lastCompletedMatch, snapshot.lastUpdated, snapshot.remainingMatches, snapshot.teamOrder.length]
  );

  const activeTabLabel = TAB_OPTIONS.find((tab) => tab.id === activeTab)?.label || "Dashboard";
  const selectedH2hRow = snapshot.h2h.rows.find((row) => row.team === selectedH2hTeam) || null;
  const selectedH2hOpponents = useMemo(() => {
    if (!selectedH2hRow) {
      return [];
    }

    const selectedIndex = snapshot.h2h.teamOrder.indexOf(selectedH2hTeam);
    return snapshot.h2h.teamOrder
      .map((opponent, index) => {
        if (opponent === selectedH2hTeam) {
          return null;
        }

        const wins = numberOrZero(selectedH2hRow.values[index]);
        const opponentRow = snapshot.h2h.rows.find((row) => row.team === opponent);
        const losses = numberOrZero(opponentRow?.values?.[selectedIndex]);

        return {
          opponent,
          wins,
          losses,
          decimal: losses > 0 ? wins / losses : null,
        };
      })
      .filter(Boolean)
      .sort((left, right) => right.wins - left.wins);
  }, [selectedH2hRow, selectedH2hTeam, snapshot.h2h.rows, snapshot.h2h.teamOrder]);

  return (
    <>
      <div className="bg-orb bg-orb-a" aria-hidden="true" />
      <div className="bg-orb bg-orb-b" aria-hidden="true" />

      <main className="app-shell">
        <header className="hero">
          <p className="eyebrow">IPL 2026</p>
          <h1>Playoff Probability Snapshot</h1>
          <p className="subtitle">Live standings, qualification odds, and opponent history in one clean dashboard.</p>
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
          <div className="section-head">
            <div>
              <div className={`status-pill ${snapshot.status}`}>{stateLabel}</div>
              <h2>{activeTabLabel}</h2>
            </div>
          </div>

          <div className="tab-switcher" role="tablist" aria-label="IPL dashboard sections">
            {TAB_OPTIONS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`tab-button ${activeTab === tab.id ? "active" : ""}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="tab-panel">
            {activeTab === "points" ? (
              snapshot.pointsTable.length ? (
                <div className="table-scroll">
                  <table className="prob-table points-table">
                    <thead>
                      <tr>
                        <th>Team</th>
                        <th>Matches Played</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody>
                      {snapshot.pointsTable.map(({ team, matchesPlayed, points }) => {
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
                            <td>{matchesPlayed}</td>
                            <td className="points-value">{points}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="message">Points table is not available yet.</p>
              )
            ) : activeTab === "playoffs" ? (
              isComputed ? (
                <div className="table-scroll">
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
                </div>
              ) : (
                <p className="message">{snapshot.message}</p>
              )
            ) : snapshot.h2h.rows.length ? (
              <div className="h2h-panel">
                <div className="h2h-controls">
                  <label className="team-picker-label" htmlFor="h2h-team-picker">
                    Select team
                  </label>
                  <div className="team-dropdown" ref={h2hDropdownRef}>
                    <button
                      id="h2h-team-picker"
                      type="button"
                      className="team-picker-button"
                      aria-haspopup="listbox"
                      aria-expanded={isH2hMenuOpen}
                      aria-label="Select team"
                      onClick={() => setIsH2hMenuOpen((open) => !open)}
                    >
                      <span>{selectedH2hTeam}</span>
                      <span className={`team-picker-chevron ${isH2hMenuOpen ? "open" : ""}`} aria-hidden="true">
                        ▾
                      </span>
                    </button>

                    {isH2hMenuOpen ? (
                      <ul className="team-picker-menu" role="listbox" aria-labelledby="h2h-team-picker">
                        {snapshot.h2h.teamOrder.map((team) => (
                          <li key={team} role="option" aria-selected={selectedH2hTeam === team}>
                            <button
                              type="button"
                              className={`team-picker-option ${selectedH2hTeam === team ? "active" : ""}`}
                              onClick={() => {
                                setSelectedH2hTeam(team);
                                setIsH2hMenuOpen(false);
                              }}
                            >
                              {team}
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                </div>

                {selectedH2hRow ? (
                  <>
                    <div className="h2h-summary-card">
                      <div className="team-cell">
                        {TEAM_LOGO_URLS[selectedH2hTeam] ? (
                          <img
                            className="team-logo"
                            src={TEAM_LOGO_URLS[selectedH2hTeam]}
                            alt={`${selectedH2hTeam} logo`}
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}
                        <div>
                          <p className="summary-label">Head-to-head profile</p>
                          <h3 className="summary-team">{selectedH2hTeam}</h3>
                        </div>
                      </div>
                      <p className="summary-copy">Historical record against each opponent from the matrix. Wins, losses, and a win/loss ratio are shown below.</p>
                    </div>

                    <div className="table-scroll h2h-scroll">
                      <table className="prob-table h2h-table">
                        <thead>
                          <tr>
                            <th>Opponent</th>
                            <th>Wins</th>
                            <th>Losses</th>
                            <th>Win/Loss ratio</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedH2hOpponents.map(({ opponent, wins, losses, decimal }) => {
                            const logoUrl = TEAM_LOGO_URLS[opponent];
                            return (
                              <tr key={opponent}>
                                <td>
                                  <div className="team-cell">
                                    {logoUrl ? (
                                      <img
                                        className="team-logo"
                                        src={logoUrl}
                                        alt={`${opponent} logo`}
                                        loading="lazy"
                                        referrerPolicy="no-referrer"
                                      />
                                    ) : null}
                                    <span className="team-code">{opponent}</span>
                                  </div>
                                </td>
                                <td>{wins}</td>
                                <td>{losses}</td>
                                <td>{decimal === null ? "∞" : decimal.toFixed(2)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <p className="message">Select a team to view its head-to-head record.</p>
                )}
              </div>
            ) : (
              <p className="message">Head-to-head data is not available yet.</p>
            )}
          </div>
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
    pointsTable: [],
    h2h: {
      teamOrder: TEAM_ORDER_FALLBACK,
      rows: [],
    },
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
    lastCompletedMatch: normalizeLastCompletedMatch(raw?.lastCompletedMatch),
    teamOrder,
    rows,
    pointsTable: normalizePointsTable(raw?.pointsTable, teamOrder),
    h2h: normalizeH2h(raw?.h2h, teamOrder),
    message: status === "unfeasible" ? raw?.message || "unfeasible to compute at the moment" : "",
  };
}

function normalizePointsTable(rawRows, teamOrder) {
  if (!Array.isArray(rawRows) || !rawRows.length) {
    return [];
  }

  const orderIndex = new Map(teamOrder.map((team, index) => [team, index]));
  return rawRows
    .map((row) => ({
      team: String(row?.team || "").toUpperCase(),
      matchesPlayed: numberOrZero(row?.matchesPlayed),
      points: numberOrZero(row?.points),
    }))
    .filter((row) => orderIndex.has(row.team))
    .sort((left, right) => {
      if (right.points !== left.points) {
        return right.points - left.points;
      }

      return orderIndex.get(left.team) - orderIndex.get(right.team);
    });
}

function normalizeH2h(rawH2h, teamOrder) {
  const fallback = {
    teamOrder,
    rows: teamOrder.map((team) => ({ team, values: Array.from({ length: teamOrder.length }, () => 0) })),
  };

  if (!rawH2h || !Array.isArray(rawH2h.rows) || !rawH2h.rows.length) {
    return fallback;
  }

  const normalizedTeamOrder = Array.isArray(rawH2h.teamOrder) && rawH2h.teamOrder.length ? rawH2h.teamOrder : teamOrder;
  const safeOrder = normalizedTeamOrder.map((team) => String(team).toUpperCase()).filter(Boolean);

  const rows = rawH2h.rows
    .map((row) => ({
      team: String(row?.team || "").toUpperCase(),
      values: Array.isArray(row?.values) ? row.values.map((value) => numberOrZero(value)) : [],
    }))
    .filter((row) => safeOrder.includes(row.team));

  if (!rows.length) {
    return fallback;
  }

  const rowMap = new Map(rows.map((row) => [row.team, row]));
  return {
    teamOrder: safeOrder,
    rows: safeOrder.map((team) => ({
      team,
      values: rowMap.get(team)?.values || Array.from({ length: safeOrder.length }, () => 0),
    })),
  };
}

function normalizeLastCompletedMatch(rawMatch) {
  if (!rawMatch || typeof rawMatch !== "object") {
    return null;
  }

  const team1 = String(rawMatch.team1 || "").toUpperCase();
  const team2 = String(rawMatch.team2 || "").toUpperCase();
  const matchId = rawMatch.matchId == null ? "" : rawMatch.matchId;

  if (!team1 || !team2 || matchId === "") {
    return null;
  }

  return {
    matchId,
    team1,
    team2,
  };
}

function formatLastCompletedMatch(rawMatch) {
  if (!rawMatch) {
    return "Unavailable";
  }

  return `#${rawMatch.matchId} ${rawMatch.team1} vs ${rawMatch.team2}`;
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