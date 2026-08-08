# Pacific Radar

Phase 0 of a browser-based air traffic control game with playable Santa Monica
Municipal (KSMO), Los Angeles International (KLAX), and Chicago O'Hare
International (KORD) tower levels.

The current prototype includes:

- Secure email/password accounts with required email verification, one-time
  password-reset links, session revocation after reset, and password-plus-email
  confirmation for permanent account deletion.
- Versioned Terms acceptance, a detailed Privacy Policy, strictly necessary
  authentication cookies, and user-facing account/privacy controls.
- A first-screen position selector for separate Air Traffic Control and Ground
  Control game modes.
- A playable KSMO Ground shift on an FAA-diagram-derived simulated airport
  surface display with
  Runway 03/21 geometry, Taxiways A/B, A1-A5 and B1-B5 markings, published
  run-up areas, parking assignments, automatic tower-controlled arrivals, and
  player-controlled takeoffs.
- Type-aware KSMO surface traffic (C172, PA28, DA42, PC12, Citation CJ2, and
  JSX ATR 42-600), realistic taxi/ramp speeds, engine-start timing, runway
  protection, surface conflicts, and arrival/departure scoring.
- A playable KLAX Ground shift on a calibrated simulated airport surface display with all
  four runways, the central terminal loop, modeled gate assignments, paired
  arrival/departure runway protection, and current Terminal 5 closure state.
- A real, attributed 18 NM satellite scope covering the Los Angeles terminal
  area around KSMO.
- A deterministic moving radar picture with multiple arrivals and departures.
- Arrivals enter only through scope boundaries; departures begin as runway
  progress strips and do not appear on radar until line-up or takeoff.
- Selectable active-control flight cards with callsign, type, altitude,
  heading, speed, status, and assigned departure exit.
- Radar history trails and five named edge fixes for outbound handoffs.
- Successful arrival removal at touchdown, successful departure removal at the
  assigned exit, and fallback handoff when a departure leaves the scope.
- ATC-SIM-style shorthand for heading/altitude/fix clearances (`C`), speed
  (`S`), landing (`L`), line-up (`W`/`LW`), takeoff (`T`), hold (`H`), and
  abort (`A`), including chained commands and expedited altitude changes.
- Altitude-before-takeoff enforcement, 3,000-foot AGL and runway-heading
  landing gates, and automatic high-altitude handoff at the assigned exit.
- `SCALE`, `STATS`, and `EXIT` commands with device-local high scores.
- Pilot readbacks, runway occupancy checks, unsafe-clearance blocking, and
  basic 3 NM / 1,000 ft separation monitoring.
- Flight strips, a radio log, a shift score, and seeded reset behavior.
- A pure Python deterministic simulation core with tests for runway occupancy,
  clearance prerequisites, and replay consistency.
- A four-runway KLAX expert level with an FAA-coordinate runway map, normal
  west-flow arrival/departure assignments, independent parallel-runway
  occupancy, heavy traffic, and a current LAX-weighted airline fleet.
- An eight-runway KORD extreme level with an FAA-coordinate 18 NM map,
  dominant west-flow runway assignments, very heavy traffic, current O'Hare
  fleet weighting, and six additional aircraft performance profiles.

The research, aircraft catalogs, performance values, and primary sources are
documented in [`docs/ksmo-ground-research.md`](docs/ksmo-ground-research.md),
[`docs/klax-ground-research.md`](docs/klax-ground-research.md),
[`docs/lax-research.md`](docs/lax-research.md), and
[`docs/ord-research.md`](docs/ord-research.md).

## Python simulation

The headless rules engine lives in `simulation/`. Run its tests with:

```bash
python -m unittest discover -s tests_py
```

The browser client is currently a Phase 0 visualization and interaction
prototype. The Python engine is the intended authoritative simulation boundary
as the project advances.

## Account email configuration

Pacific Radar sends verification, password-reset, and deletion-confirmation
messages through the Gmail API. Copy `.env.example` to `.env.local` for local
development and configure the equivalent values in the hosting environment for
production. `BETTER_AUTH_URL` must be the public site origin and
`BETTER_AUTH_SECRET` must be a unique random secret of at least 32 characters.

In Google Cloud, enable the Gmail API and create an OAuth 2.0 client. Authorize
the sending Google account for offline access with the
`https://www.googleapis.com/auth/gmail.send` scope, then put the client ID,
client secret, resulting refresh token, and sender address in the corresponding
`GMAIL_*` variables. An API key alone cannot send Gmail messages. The sender
must be the account that authorized the refresh token or one of its configured
Gmail “Send mail as” aliases. Keep all OAuth values server-side; never expose
them through a `NEXT_PUBLIC_*` variable or commit a populated environment file.

Without email credentials, local development prints the single-use account
link to the server console. Production deliberately fails closed instead of
pretending an account email was delivered.

After changing `db/schema.ts`, generate and apply the checked-in Drizzle
migrations before serving authentication traffic.

## Data and imagery

Airport facts are based on current FAA material. ATC scopes use attributed Esri
World Imagery; Ground scopes use code-drawn airport surface displays derived from
FAA diagrams so pavement, taxi routes, terminals, and aircraft share one stable
projection. The prototype is for entertainment and software development, not
operational ATC training.
