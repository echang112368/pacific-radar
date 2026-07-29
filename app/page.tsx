import Link from "next/link";

const airports = [
  {
    code: "KSMO",
    city: "Santa Monica, California",
    name: "Santa Monica Municipal",
    runway: "03 / 21",
    traffic: "Light",
    difficulty: "Starter",
    status: "Playable now",
    href: "/airports/ksmo",
    className: "airport-card-ksmo",
  },
  {
    code: "KSNA",
    city: "Orange County, California",
    name: "John Wayne",
    runway: "02L / 20R",
    traffic: "Regional",
    difficulty: "Intermediate",
    status: "Coming next",
    className: "airport-card-ksna",
  },
  {
    code: "KLAX",
    city: "Los Angeles, California",
    name: "Los Angeles International",
    runway: "4 runways",
    traffic: "Heavy",
    difficulty: "Expert",
    status: "Planned",
    className: "airport-card-klax",
  },
] as const;

function RadarTarget({
  callsign,
  detail,
  className,
}: {
  callsign: string;
  detail: string;
  className: string;
}) {
  return (
    <div className={`landing-radar-target ${className}`} aria-hidden="true">
      <span className="landing-target-square" />
      <span className="landing-target-copy">
        <strong>{callsign}</strong>
        <small>{detail}</small>
      </span>
    </div>
  );
}

export default function Home() {
  return (
    <main className="landing-page">
      <header className="landing-nav">
        <Link className="landing-brand" href="/" aria-label="Pacific Radar home">
          <span className="landing-brand-mark" aria-hidden="true">
            PR
          </span>
          <span>
            <strong>PACIFIC RADAR</strong>
            <small>Air traffic control simulator</small>
          </span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="#airports">Airports</a>
          <a href="#how-it-works">How it works</a>
          <a href="#progression">Progression</a>
        </nav>
        <Link className="landing-nav-cta" href="/airports/ksmo">
          Play KSMO
          <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="landing-hero">
        <div className="landing-hero-copy">
          <p className="landing-kicker">
            BROWSER-BASED AIR TRAFFIC CONTROL
          </p>
          <h1>
            Own the frequency.
            <br />
            Shape the airspace.
          </h1>
          <p className="landing-hero-lede">
            Vector arrivals, launch departures, and keep every aircraft
            separated in a live terminal airspace. Start with one runway.
            Build toward the world&apos;s busiest airports.
          </p>
          <div className="landing-hero-actions">
            <Link className="landing-primary-cta" href="/airports/ksmo">
              Start at Santa Monica
              <span aria-hidden="true">→</span>
            </Link>
            <a className="landing-secondary-cta" href="#airports">
              Choose an airport
            </a>
          </div>
          <dl className="landing-hero-facts">
            <div>
              <dt>NO INSTALL</dt>
              <dd>Play in your browser</dd>
            </div>
            <div>
              <dt>LIVE COMMANDS</dt>
              <dd>Real ATC shorthand</dd>
            </div>
            <div>
              <dt>DYNAMIC TRAFFIC</dt>
              <dd>Every shift builds</dd>
            </div>
          </dl>
        </div>

        <div className="landing-scope-wrap" aria-label="Santa Monica radar preview">
          <div className="landing-scope-status">
            <span>
              <i aria-hidden="true" />
              KSMO LIVE SCOPE
            </span>
            <strong>RWY 21 · 240° / 08 KT</strong>
          </div>
          <div className="landing-scope">
            <div className="landing-scope-grid" aria-hidden="true" />
            <div className="landing-range-ring landing-ring-one" aria-hidden="true" />
            <div className="landing-range-ring landing-ring-two" aria-hidden="true" />
            <div className="landing-runway" aria-hidden="true">
              <span>03</span>
              <i />
              <span>21</span>
            </div>
            <RadarTarget
              callsign="N172SP"
              detail="046↑ · 115KT"
              className="target-north"
            />
            <RadarTarget
              callsign="JSX422"
              detail="062↓ · 190KT"
              className="target-east"
            />
            <RadarTarget
              callsign="SURF52"
              detail="100↑ · 145KT"
              className="target-south"
            />
            <div className="landing-scope-fix fix-waker" aria-hidden="true">
              ◇ <span>WAKER</span>
            </div>
            <div className="landing-scope-fix fix-morve" aria-hidden="true">
              ◇ <span>MORVE</span>
            </div>
          </div>
          <div className="landing-scope-footer">
            <span>35 NM TERMINAL SCOPE</span>
            <span>5 NM RINGS</span>
            <span>SATELLITE</span>
          </div>
        </div>
      </section>

      <section className="landing-section airport-section" id="airports">
        <div className="landing-section-heading">
          <div>
            <p className="landing-kicker">CHOOSE YOUR AIRSPACE</p>
            <h2>Start local. Earn the big scope.</h2>
          </div>
          <p>
            Each airport is its own operating challenge, with distinct
            runways, traffic volume, geography, and aircraft mix.
          </p>
        </div>

        <div className="airport-grid">
          {airports.map((airport, index) => {
            const href = "href" in airport ? airport.href : null;
            const available = Boolean(href);
            return (
              <article
                className={`airport-card ${airport.className} ${available ? "is-playable" : "is-locked"}`}
                key={airport.code}
              >
                <div className="airport-card-map">
                  <span className="airport-index">0{index + 1}</span>
                  <span className="airport-status">{airport.status}</span>
                  <span className="airport-runway-mark" aria-hidden="true" />
                </div>
                <div className="airport-card-body">
                  <p>{airport.city}</p>
                  <div className="airport-name-row">
                    <h3>{airport.code}</h3>
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
                      <dt>LEVEL</dt>
                      <dd>{airport.difficulty}</dd>
                    </div>
                  </dl>
                  {available ? (
                    <Link className="airport-play-link" href={href ?? "/"}>
                      Control this airport
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : (
                    <span className="airport-locked-link" aria-disabled="true">
                      Airport not yet available
                      <span aria-hidden="true">—</span>
                    </span>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="landing-section control-loop-section" id="how-it-works">
        <div className="landing-section-heading compact">
          <div>
            <p className="landing-kicker">THE CONTROLLER LOOP</p>
            <h2>Read. Decide. Transmit.</h2>
          </div>
          <p>
            Every instruction changes the picture. Stay ahead of the traffic
            and keep the runway moving.
          </p>
        </div>
        <ol className="control-loop">
          <li>
            <span>01</span>
            <div className="loop-icon" aria-hidden="true">
              ◇
            </div>
            <h3>Build the picture</h3>
            <p>
              Read each flight&apos;s heading, altitude, speed, and destination
              as traffic enters your airspace.
            </p>
          </li>
          <li>
            <span>02</span>
            <div className="loop-icon command-icon" aria-hidden="true">
              &gt;_
            </div>
            <h3>Issue clearances</h3>
            <p>
              Use compact commands to vector, climb, descend, sequence, hold,
              land, and clear aircraft for takeoff.
            </p>
          </li>
          <li>
            <span>03</span>
            <div className="loop-icon" aria-hidden="true">
              ↗
            </div>
            <h3>Complete the flight</h3>
            <p>
              Land arrivals safely and deliver departures to the correct exit
              fix without losing separation.
            </p>
          </li>
        </ol>
        <div className="landing-command-demo">
          <span className="command-frequency">120.100</span>
          <code>
            <b aria-hidden="true">&gt;</b> N172SP C 3 C 210 S 140
          </code>
          <span className="command-result">
            Climb 3,000 · Heading 210 · Speed 140
          </span>
        </div>
      </section>

      <section className="landing-section progression-section" id="progression">
        <div className="progression-copy">
          <p className="landing-kicker">CAREER PROGRESSION</p>
          <h2>Your first runway is only the beginning.</h2>
          <p>
            Master a neighborhood airport, expand its capacity, and unlock
            increasingly complex airspace. More runways bring more routes,
            heavier aircraft, tighter sequencing, and bigger rewards.
          </p>
          <Link href="/airports/ksmo">
            Begin your first shift <span aria-hidden="true">→</span>
          </Link>
        </div>
        <div className="progression-ladder" aria-label="Airport progression">
          <div className="progression-step is-current">
            <span>01</span>
            <div>
              <small>LOCAL FIELD</small>
              <strong>1 runway</strong>
              <p>Learn arrivals, departures, and handoffs.</p>
            </div>
          </div>
          <div className="progression-line" aria-hidden="true" />
          <div className="progression-step">
            <span>02</span>
            <div>
              <small>REGIONAL AIRPORT</small>
              <strong>2 runways</strong>
              <p>Balance crossing traffic and faster jets.</p>
            </div>
          </div>
          <div className="progression-line" aria-hidden="true" />
          <div className="progression-step">
            <span>03</span>
            <div>
              <small>MAJOR HUB</small>
              <strong>4+ runways</strong>
              <p>Control parallel flows at full intensity.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-final-cta">
        <div>
          <p className="landing-kicker">KSMO · RUNWAY 03 / 21</p>
          <h2>Your scope is clear. Traffic is inbound.</h2>
        </div>
        <Link href="/airports/ksmo">
          Take the frequency
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      <footer className="landing-footer">
        <Link className="landing-brand" href="/" aria-label="Pacific Radar home">
          <span className="landing-brand-mark" aria-hidden="true">
            PR
          </span>
          <span>
            <strong>PACIFIC RADAR</strong>
            <small>Built for the next clearance</small>
          </span>
        </Link>
        <p>
          A browser-based air traffic control game in active development.
        </p>
        <Link href="/airports/ksmo">Open KSMO scope ↗</Link>
      </footer>
    </main>
  );
}
