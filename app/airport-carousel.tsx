"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { authClient } from "../lib/auth-client";
import {
  AIRPORTS as PLAYABLE_AIRPORTS,
  type AirportCode,
} from "../lib/airports";

const AIRPORTS = [
  {
    code: "KSMO",
    name: "Santa Monica Municipal",
    location: "Santa Monica, California",
    runway: "03 / 21",
    traffic: "Light",
    difficulty: "Beginner",
    status: "AVAILABLE",
    href: "/airports/ksmo",
  },
  {
    code: "KSNA",
    name: "John Wayne",
    location: "Orange County, California",
    runway: "02L / 20R",
    traffic: "Regional",
    difficulty: "Intermediate",
    status: "LOCKED",
  },
  {
    code: "KLAX",
    name: "Los Angeles International",
    location: "Los Angeles, California",
    runway: "4 runways",
    traffic: "Heavy",
    difficulty: "Expert",
    status: "AVAILABLE",
    href: "/airports/klax",
  },
  {
    code: "KORD",
    name: "Chicago O'Hare International",
    location: "Chicago, Illinois",
    runway: "8 runways",
    traffic: "Very Heavy",
    difficulty: "Extreme",
    status: "AVAILABLE",
    href: "/airports/kord",
  },
] as const;

const HOW_TO_PLAY_COMMANDS = [
  {
    command: "N172SP C 035",
    description: "Turn to heading 035°. Three-digit headings require leading zeros.",
  },
  {
    command: "N172SP C 3",
    description: "Climb or descend to 3,000 feet. One or two digits mean thousands.",
  },
  {
    command: "N172SP C 14 EX",
    description: "Climb or descend to 14,000 feet at twice the normal vertical rate.",
  },
  {
    command: "N172SP C SMO L",
    description: "Fly direct to SMO with a forced left turn. R forces a right turn.",
  },
  {
    command: "N172SP S 100",
    description: "Set the aircraft speed to 100 knots.",
  },
  {
    command: "N172SP L 21",
    description: "Intercept the Runway 21 centerline and land when eligible.",
  },
  {
    command: "N4382K W",
    description: "Line up and wait. LW and LUAW are accepted aliases.",
  },
  {
    command: "N4382K T",
    description: "Clear a departure for takeoff after assigning its altitude.",
  },
  {
    command: "N172SP H SMO",
    description: "Hold an airborne aircraft at the named fix.",
  },
  {
    command: "N172SP A",
    description: "Abort a takeoff or send an approach aircraft around.",
  },
  {
    command: "N4382K C 5 C MALIBU T",
    description: "Chain altitude, route, and takeoff instructions in one transmission.",
  },
  {
    command: "HELP · SCALE · STATS · EXIT",
    description: "Open help, toggle range scale, review performance, or end the shift.",
  },
] as const;

type AirportCarouselProps = {
  displayName: string;
};

type GameMode = "atc" | "ground";

export function AirportCarousel({ displayName }: AirportCarouselProps) {
  const [selectedMode, setSelectedMode] = useState<GameMode | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const airport = AIRPORTS[selectedIndex];
  const towerHref = "href" in airport ? airport.href : null;
  const href =
    selectedMode === "ground"
      ? airport.code === "KSMO"
        ? "/airports/ksmo/ground"
        : airport.code === "KLAX"
          ? "/airports/klax/ground"
        : null
      : towerHref;
  const displayStatus =
    selectedMode === "ground" && !["KSMO", "KLAX"].includes(airport.code)
      ? "GROUND LOCKED"
      : airport.status;
  const previewAirport =
    airport.code === "KSNA"
      ? null
      : PLAYABLE_AIRPORTS[airport.code as AirportCode];

  const moveSelection = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => {
      return (current + direction + AIRPORTS.length) % AIRPORTS.length;
    });
  }, []);

  useEffect(() => {
    if (!showHowToPlay) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setShowHowToPlay(false);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [showHowToPlay]);

  if (selectedMode === null) {
    return (
      <main className="airport-select-screen role-select-screen airport-ksmo">
        <div className="airport-select-background" aria-hidden="true" />
        <header className="airport-select-header">
          <div className="login-brand">
            <span aria-hidden="true">PR</span>
            <strong>PACIFIC RADAR</strong>
          </div>
          <nav aria-label="Player controls">
            <span>{displayName}</span>
            <Link className="account-link" href="/account">Account</Link>
            <button
              onClick={async () => {
                await authClient.signOut();
                window.location.href = "/";
              }}
              type="button"
            >
              Log out
            </button>
          </nav>
        </header>

        <section className="role-select" aria-labelledby="role-select-title">
          <p className="airport-carousel-label">SELECT POSITION</p>
          <h1 id="role-select-title">Choose your control room</h1>
          <p className="role-select-intro">
            Work the airspace from the tower scope, or manage every movement on
            the airport surface.
          </p>
          <div className="role-card-grid">
            <button
              className="role-card role-card-atc"
              onClick={() => setSelectedMode("atc")}
              type="button"
            >
              <span className="role-card-visual role-radar-visual" aria-hidden="true">
                <i /><i /><i />
                <b>✦</b>
              </span>
              <span className="role-card-copy">
                <small>RADAR · TOWER</small>
                <strong>Air Traffic Control</strong>
                <em>Vector arrivals, clear landings, launch departures, and hand aircraft to the next sector.</em>
              </span>
              <span className="role-card-action">Select ATC <b aria-hidden="true">→</b></span>
            </button>

            <button
              className="role-card role-card-ground"
              onClick={() => {
                setSelectedIndex(0);
                setSelectedMode("ground");
              }}
              type="button"
            >
              <span className="role-card-visual role-ground-visual" aria-hidden="true">
                <i className="role-runway" />
                <i className="role-taxiway role-taxiway-a" />
                <i className="role-taxiway role-taxiway-b" />
                <b>✈</b>
              </span>
              <span className="role-card-copy">
                <small>SURFACE · 121.9</small>
                <strong>Ground Control</strong>
                <em>Route aircraft between parking and active runways, protect arrivals, and release safe takeoffs.</em>
              </span>
              <span className="role-card-action">Select Ground <b aria-hidden="true">→</b></span>
            </button>
          </div>
          <p className="role-availability">Ground Control is available at KSMO · Santa Monica and KLAX · Los Angeles International</p>
        </section>
        <footer className="airport-select-footer">
          <span>Entertainment simulation · Not for operational use</span>
          <nav aria-label="Legal">
            <Link href="/privacy">Privacy</Link>
            <Link href="/terms">Terms</Link>
          </nav>
          <span>Account protected</span>
        </footer>
      </main>
    );
  }

  return (
    <main
      className={`airport-select-screen airport-${airport.code.toLowerCase()}`}
      onKeyDown={(event) => {
        if (showHowToPlay) return;
        if (event.key === "ArrowLeft") moveSelection(-1);
        if (event.key === "ArrowRight") moveSelection(1);
      }}
      tabIndex={0}
    >
      <div className="airport-select-background" aria-hidden="true" />

      <header className="airport-select-header">
        <div className="login-brand">
          <span aria-hidden="true">PR</span>
          <strong>PACIFIC RADAR</strong>
        </div>
        <nav aria-label="Game and player controls">
          <button
            className="mode-change-trigger"
            onClick={() => setSelectedMode(null)}
            type="button"
          >
            {selectedMode === "atc" ? "ATC" : "Ground"} · Change
          </button>
          <button
            className="how-to-play-trigger"
            onClick={() => setShowHowToPlay(true)}
            type="button"
          >
            <span aria-hidden="true">?</span>
            How to play
          </button>
          <span>{displayName}</span>
          <Link className="account-link" href="/account">Account</Link>
          <button
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/";
            }}
            type="button"
          >
            Log out
          </button>
        </nav>
      </header>

      <section className="airport-carousel" aria-labelledby="airport-title">
        <p className="airport-carousel-label">
          SELECT AIRPORT · {selectedMode === "atc" ? "AIR TRAFFIC CONTROL" : "GROUND CONTROL"}
        </p>

        <div className="airport-carousel-stage">
          <button
            aria-label="Previous airport"
            className="airport-arrow airport-arrow-left"
            onClick={() => moveSelection(-1)}
            type="button"
          >
            <span aria-hidden="true">‹</span>
          </button>

          <article className="airport-focus-card">
            <div className="airport-focus-image">
              <span className="airport-focus-status">{displayStatus}</span>
              {previewAirport ? (
                <div className="airport-preview-scope" aria-hidden="true">
                  <span className="airport-preview-boundary" />
                  <span className="airport-preview-ring airport-preview-ring-one" />
                  <span className="airport-preview-ring airport-preview-ring-two" />
                  <span className="airport-preview-ring airport-preview-ring-three" />
                  <svg
                    className="airport-preview-runway-layer"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 100"
                  >
                    {previewAirport.runways.map((runway) => {
                      const first = previewAirport.runwayEnds[runway.ends[0]];
                      const second = previewAirport.runwayEnds[runway.ends[1]];
                      return (
                      <g key={runway.designation}>
                        <line
                          className="airport-preview-runway-outline"
                          x1={first.threshold.x}
                          x2={second.threshold.x}
                          y1={first.threshold.y}
                          y2={second.threshold.y}
                        />
                        <line
                          className="airport-preview-runway-surface"
                          x1={first.threshold.x}
                          x2={second.threshold.x}
                          y1={first.threshold.y}
                          y2={second.threshold.y}
                        />
                      </g>
                      );
                    })}
                  </svg>
                  {Object.values(previewAirport.runwayEnds).map((runwayEnd) => (
                    <span
                      className={`airport-preview-runway-label airport-preview-runway-${runwayEnd.id.toLowerCase()}`}
                      key={runwayEnd.id}
                      style={{
                        left: `${runwayEnd.threshold.x}%`,
                        top: `${runwayEnd.threshold.y}%`,
                      }}
                    >
                      {runwayEnd.id}
                    </span>
                  ))}
                  <span className="airport-preview-marker">
                    <i />
                    {airport.code.slice(1)}
                  </span>
                </div>
              ) : (
                <div className="airport-preview-unavailable">
                  <span>RADAR PREVIEW</span>
                  <strong>NOT YET AVAILABLE</strong>
                </div>
              )}
            </div>

            <div className="airport-focus-details">
              <p>{airport.location}</p>
              <h1 id="airport-title">{airport.code}</h1>
              <h2>{airport.name}</h2>

              <dl>
                <div>
                  <dt>RUNWAY</dt>
                  <dd>{airport.runway}</dd>
                </div>
                <div>
                  <dt>TRAFFIC</dt>
                  <dd>{airport.traffic}</dd>
                </div>
                <div>
                  <dt>DIFFICULTY</dt>
                  <dd>{airport.difficulty}</dd>
                </div>
              </dl>

              {href ? (
                <Link className="airport-play-button" href={href}>
                  Play {selectedMode === "ground" ? "Ground" : "ATC"}
                  <span aria-hidden="true">→</span>
                </Link>
              ) : (
                <button className="airport-play-button is-locked" disabled>
                  Locked
                </button>
              )}
            </div>
          </article>

          <button
            aria-label="Next airport"
            className="airport-arrow airport-arrow-right"
            onClick={() => moveSelection(1)}
            type="button"
          >
            <span aria-hidden="true">›</span>
          </button>
        </div>

        <div className="airport-carousel-position" aria-live="polite">
          {AIRPORTS.map((item, index) => (
            <button
              aria-label={`Select ${item.code}`}
              className={index === selectedIndex ? "is-selected" : ""}
              key={item.code}
              onClick={() => setSelectedIndex(index)}
              type="button"
            >
              {item.code}
            </button>
          ))}
        </div>
      </section>

      <footer className="airport-select-footer">
        <span>Use ← → to change airport</span>
        <nav aria-label="Legal">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
        </nav>
        <span>{selectedIndex + 1} / {AIRPORTS.length}</span>
      </footer>

      {showHowToPlay ? (
        <div
          className="modal-backdrop how-to-backdrop"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setShowHowToPlay(false);
          }}
          role="presentation"
        >
          <section
            aria-describedby="how-to-play-intro"
            aria-labelledby="how-to-play-title"
            aria-modal="true"
            className="command-modal how-to-modal"
            role="dialog"
          >
            <div className="modal-header how-to-header">
              <div>
                <p className="eyebrow">CONTROLLER BRIEFING</p>
                <h2 id="how-to-play-title">How to play</h2>
              </div>
              <button
                aria-label="Close how to play"
                autoFocus
                onClick={() => setShowHowToPlay(false)}
                type="button"
              >
                ×
              </button>
            </div>

            <p className="modal-intro" id="how-to-play-intro">
              Route arriving and departing aircraft safely, land arrivals, and
              hand departures to nearby airspace through their assigned exit fix.
              Traffic gradually becomes busier as the shift continues.
            </p>

            <div className="how-to-rule-grid">
              <article>
                <span>01</span>
                <div>
                  <h3>Maintain separation</h3>
                  <p>
                    Aircraft are safely separated when they have at least 1,000
                    feet laterally or 1,000 feet vertically. Targets turn red
                    only when both minimums are lost.
                  </p>
                </div>
              </article>
              <article>
                <span>02</span>
                <div>
                  <h3>Complete each flight</h3>
                  <p>
                    Arrivals score after landing and stopping on the runway.
                    Departures score after reaching their assigned edge fix at
                    least 4,000 feet above the airport.
                  </p>
                </div>
              </article>
              <article>
                <span>03</span>
                <div>
                  <h3>Avoid shift-ending failures</h3>
                  <p>
                    A collision occurs inside 500 feet laterally and vertically.
                    A collision or the third incorrect handoff ends the shift.
                  </p>
                </div>
              </article>
              <article>
                <span>04</span>
                <div>
                  <h3>Use Runway 03/21 correctly</h3>
                  <p>
                    Departures need an altitude before takeoff. Landing clearance
                    requires 3,000 feet AGL or lower and a heading less than 90°
                    from the selected runway centerline.
                  </p>
                </div>
              </article>
            </div>

            <div className="how-to-command-heading">
              <div>
                <p className="eyebrow">COMMAND REFERENCE</p>
                <h3>Callsign + command + value</h3>
              </div>
              <code>FLIGHTID C 035</code>
            </div>

            <div className="command-grid how-to-command-grid">
              {HOW_TO_PLAY_COMMANDS.map((item) => (
                <div key={item.command}>
                  <code>{item.command}</code>
                  <span>{item.description}</span>
                </div>
              ))}
            </div>

            <div className="how-to-notes">
              <article>
                <strong>Departure flow</strong>
                <p>
                  Assign an altitude, optionally assign an exit fix or heading,
                  then use W to line up and wait or T to begin the full takeoff
                  sequence. Aircraft remain on runway heading until safely clear.
                </p>
              </article>
              <article>
                <strong>Arrival flow</strong>
                <p>
                  Descend, control speed, vector toward Runway 03 or 21, and issue
                  the landing clearance before the aircraft passes the centerline.
                </p>
              </article>
              <article>
                <strong>Planning while paused</strong>
                <p>
                  Pausing freezes traffic and the clock. Commands remain available
                  and are queued in order for the aircraft to follow after resume.
                </p>
              </article>
              <article>
                <strong>Accepted long forms</strong>
                <p>
                  HDG, ALT, DIRECT, SPEED, APP, LAND, HOLD, ABORT, TAXI, and QUIT
                  are accepted alongside the compact controller shorthand shown
                  above.
                </p>
              </article>
            </div>

            <div className="how-to-score-note">
              <strong>Scoring</strong>
              <span>+100 safe landing</span>
              <span>+100 safe handoff</span>
              <span>3 handoff errors = shift failed</span>
            </div>

            <button
              className="primary-button wide-button how-to-return"
              onClick={() => setShowHowToPlay(false)}
              type="button"
            >
              Return to airport selection
            </button>
          </section>
        </div>
      ) : null}
    </main>
  );
}
