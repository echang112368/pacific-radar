import Link from "next/link";

const airports = [
  {
    code: "KSMO",
    name: "Santa Monica Municipal",
    location: "Santa Monica, California",
    runway: "03 / 21",
    traffic: "Light",
    difficulty: "Beginner",
    status: "Available",
    href: "/airports/ksmo",
  },
  {
    code: "KSNA",
    name: "John Wayne",
    location: "Orange County, California",
    runway: "02L / 20R",
    traffic: "Regional",
    difficulty: "Intermediate",
    status: "Locked",
  },
  {
    code: "KLAX",
    name: "Los Angeles International",
    location: "Los Angeles, California",
    runway: "4 runways",
    traffic: "Heavy",
    difficulty: "Expert",
    status: "Locked",
  },
] as const;

export default function Home() {
  return (
    <main className="game-menu-page">
      <header className="game-menu-header">
        <div className="game-menu-brand">
          <span aria-hidden="true">PR</span>
          <div>
            <strong>PACIFIC RADAR</strong>
            <small>Air Traffic Control Simulator</small>
          </div>
        </div>
        <div className="game-menu-version">BUILD 0.1</div>
      </header>

      <section className="airport-menu" aria-labelledby="airport-menu-title">
        <div className="airport-menu-heading">
          <p>NEW GAME</p>
          <h1 id="airport-menu-title">Select an airport</h1>
          <span>Choose an airport to begin your shift.</span>
        </div>

        <div className="airport-menu-grid">
          {airports.map((airport, index) => {
            const href = "href" in airport ? airport.href : null;

            return (
              <article
                className={`airport-menu-card ${href ? "available" : "locked"}`}
                key={airport.code}
              >
                <div className="airport-menu-map">
                  <span className="airport-menu-number">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="airport-menu-status">{airport.status}</span>
                  <span className="airport-menu-runway" aria-hidden="true" />
                </div>

                <div className="airport-menu-details">
                  <p>{airport.location}</p>
                  <div className="airport-menu-name">
                    <h2>{airport.code}</h2>
                    <span>{airport.name}</span>
                  </div>

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
                    <Link className="airport-menu-launch" href={href}>
                      Launch game
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className="airport-menu-disabled">
                      Not yet available
                      <span aria-hidden="true">—</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="game-menu-footer">
        <span>KSMO is currently available to play.</span>
        <span>More airports will be added later.</span>
      </footer>
    </main>
  );
}
