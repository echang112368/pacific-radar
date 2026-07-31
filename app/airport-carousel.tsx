"use client";

import Link from "next/link";
import { useCallback, useState } from "react";
import { authClient } from "../lib/auth-client";

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
    status: "LOCKED",
  },
] as const;

type AirportCarouselProps = {
  displayName: string;
};

export function AirportCarousel({ displayName }: AirportCarouselProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const airport = AIRPORTS[selectedIndex];
  const href = "href" in airport ? airport.href : null;

  const moveSelection = useCallback((direction: -1 | 1) => {
    setSelectedIndex((current) => {
      return (current + direction + AIRPORTS.length) % AIRPORTS.length;
    });
  }, []);

  return (
    <main
      className={`airport-select-screen airport-${airport.code.toLowerCase()}`}
      onKeyDown={(event) => {
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
        <nav aria-label="Player account">
          <span>{displayName}</span>
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
        <p className="airport-carousel-label">SELECT AIRPORT</p>

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
              <span className="airport-focus-status">{airport.status}</span>
              <div className="airport-focus-runway" aria-hidden="true">
                <span>03</span>
                <i />
                <span>21</span>
              </div>
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
                  Play
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
        <span>{selectedIndex + 1} / {AIRPORTS.length}</span>
      </footer>
    </main>
  );
}
