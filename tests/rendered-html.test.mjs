import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("renders a native Pacific Radar email and password screen", async () => {
  const [authGate, layout] = await Promise.all([
    readFile(new URL("../app/auth-gate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(layout, /Pacific Radar — Air Traffic Control Simulator/);
  assert.match(authGate, /PACIFIC RADAR/);
  assert.match(authGate, /Sign in to play/);
  assert.match(authGate, /type="email"/);
  assert.match(authGate, /autoComplete="email"/);
  assert.match(authGate, /type="password"/);
  assert.match(authGate, /"current-password"/);
  assert.match(authGate, /Sign up/);
  assert.match(authGate, /Create one/);
  assert.doesNotMatch(authGate, /Continue with ChatGPT|signin-with-chatgpt/);
});

test("redirects anonymous players before loading simulator state", async () => {
  const [authServer, route] = await Promise.all([
    readFile(new URL("../lib/auth-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/airports/ksmo/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(authServer, /if \(!getSessionCookie\(requestHeaders\)\) return null/);
  assert.match(authServer, /if \(!session\) redirect\("\/"\)/);
  assert.match(route, /await requireSession\(\)/);
});

test("defines database-backed auth and a keyboard-accessible airport carousel", async () => {
  const [
    page,
    authGate,
    authServer,
    authConfig,
    authRoute,
    schema,
    migration,
    carousel,
    css,
    route,
  ] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/auth-gate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth-server.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/api/auth/[...all]/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0000_flowery_omega_flight.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/airports/ksmo/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /<AuthGate initialNotice=/);
  assert.match(authGate, /authClient\.useSession\(\)/);
  assert.match(authGate, /authClient\.signIn\.email/);
  assert.match(authGate, /authClient\.signUp\.email/);
  assert.match(authGate, /type="email"/);
  assert.match(authGate, /type="password"/);
  assert.match(authGate, /MINIMUM_NEW_PASSWORD_LENGTH = 15/);
  assert.match(authGate, /<AirportCarousel displayName=/);
  assert.match(authServer, /getSessionCookie/);
  assert.match(authServer, /createAuth\(\)\.api\.getSession/);
  assert.match(authConfig, /drizzleAdapter\(getDb\(\)/);
  assert.match(authConfig, /emailAndPassword:\s*\{\s*enabled: true/s);
  assert.match(authConfig, /storage: "database"/);
  assert.match(authConfig, /"\/sign-in\/email"/);
  assert.match(authRoute, /export async function GET/);
  assert.match(authRoute, /export async function POST/);
  assert.match(schema, /export const user = sqliteTable/);
  assert.match(schema, /export const session = sqliteTable/);
  assert.match(schema, /export const account = sqliteTable/);
  assert.match(schema, /export const rateLimit = sqliteTable/);
  assert.match(migration, /CREATE TABLE `user`/);
  assert.match(migration, /CREATE TABLE `session`/);
  assert.match(migration, /CREATE TABLE `account`/);
  assert.match(migration, /CREATE TABLE `rate_limit`/);
  assert.match(carousel, /href: "\/airports\/ksmo"/);
  assert.match(carousel, /const AIRPORTS = \[/);
  assert.match(carousel, /status: "AVAILABLE"/);
  assert.match(carousel, /status: "LOCKED"/);
  assert.match(carousel, /event\.key === "ArrowLeft"/);
  assert.match(carousel, /event\.key === "ArrowRight"/);
  assert.match(carousel, /aria-label="Previous airport"/);
  assert.match(carousel, /aria-label="Next airport"/);
  assert.match(carousel, /authClient\.signOut\(\)/);
  assert.match(route, /<RadarSimulator \/>/);
  assert.match(route, /await requireSession\(\)/);
  assert.match(css, /\.login-home/);
  assert.match(css, /\.auth-form/);
  assert.match(css, /\.auth-error/);
  assert.match(css, /\.airport-carousel-stage/);
  assert.match(css, /\.airport-play-button/);
  assert.match(css, /@media \(max-width: 620px\)/);
});

test("hardens browser, request, input, password, and dependency boundaries", async () => {
  const [
    worker,
    authConfig,
    authGate,
    userInput,
    simulator,
    groundSimulator,
    laxGroundSimulator,
    packageJson,
    pnpmWorkspace,
    securityWorkflow,
    securityPolicy,
    privacy,
  ] = await Promise.all([
    readFile(new URL("../worker/index.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth-gate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/user-input.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/ground-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lax-ground-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../pnpm-workspace.yaml", import.meta.url), "utf8"),
    readFile(new URL("../.github/workflows/security.yml", import.meta.url), "utf8"),
    readFile(new URL("../SECURITY.md", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(worker, /MAX_AUTH_REQUEST_BYTES = 32 \* 1024/);
  assert.match(worker, /Content-Security-Policy/);
  assert.match(worker, /object-src 'none'/);
  assert.match(worker, /frame-ancestors 'none'/);
  assert.match(worker, /X-Content-Type-Options/);
  assert.match(worker, /Strict-Transport-Security/);
  assert.match(worker, /rejectsCrossSiteMutation/);
  assert.match(worker, /Unsupported request content type/);
  assert.match(worker, /Cache-Control", "no-store"/);
  assert.match(authConfig, /MINIMUM_PASSWORD_LENGTH = 15/);
  assert.match(authConfig, /haveIBeenPwned/);
  assert.match(authConfig, /useSecureCookies: isProduction/);
  assert.match(authConfig, /disableCSRFCheck: false/);
  assert.match(authConfig, /storeIdentifier: "hashed"/);
  assert.match(authGate, /return "We could not complete that request/);
  assert.doesNotMatch(authGate, /return message/);
  assert.match(userInput, /MAX_SIMULATOR_COMMAND_LENGTH = 160/);
  assert.match(userInput, /CONTROL_AND_DIRECTIONAL_CHARACTERS/);
  for (const source of [simulator, groundSimulator, laxGroundSimulator]) {
    assert.match(source, /sanitizeSimulatorCommand/);
    assert.match(source, /maxLength=\{MAX_SIMULATOR_COMMAND_LENGTH\}/);
    assert.doesNotMatch(source, /dangerouslySetInnerHTML|\.innerHTML\s*=|\beval\(/);
  }
  assert.match(simulator, /parseStoredHighScores/);
  assert.match(packageJson, /"packageManager": "pnpm@11\.9\.0"/);
  assert.match(packageJson, /"security:scan"/);
  assert.match(pnpmWorkspace, /strictDepBuilds: true/);
  assert.match(pnpmWorkspace, /minimumReleaseAge: 1440/);
  assert.match(pnpmWorkspace, /blockExoticSubdeps: true/);
  assert.doesNotMatch(pnpmWorkspace, /^\s{2}(esbuild|sharp|workerd): true$/m);
  assert.match(securityWorkflow, /osv-scanner-reusable\.yml@8dc09193/);
  assert.match(securityPolicy, /No control can guarantee/);
  assert.match(privacy, /first five characters of its\s+SHA-1 hash/);
});

test("keeps the account footer at the viewport edge while legal content scrolls", async () => {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

  const accountFlowStyles = css.slice(
    css.indexOf(".account-flow-page"),
    css.indexOf(".account-flow-background"),
  );
  const accountContentStyles = css.slice(
    css.indexOf(".account-flow-content {"),
    css.indexOf(".account-flow-content.is-wide"),
  );

  assert.match(accountFlowStyles, /height: 100dvh/);
  assert.match(accountFlowStyles, /grid-template-rows: 66px minmax\(0, 1fr\) 40px/);
  assert.match(accountFlowStyles, /overflow: hidden/);
  assert.match(accountContentStyles, /height: 100%/);
  assert.match(accountContentStyles, /overflow-y: auto/);
  assert.match(accountContentStyles, /padding: 52px 0/);
});

test("implements the complete secure account lifecycle and legal controls", async () => {
  const [
    authConfig,
    authGate,
    authClient,
    email,
    schema,
    migration,
    forgotPassword,
    resetPassword,
    accountSettings,
    privacy,
    terms,
  ] = await Promise.all([
    readFile(new URL("../lib/auth.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/auth-gate.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/auth-client.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/email.ts", import.meta.url), "utf8"),
    readFile(new URL("../db/schema.ts", import.meta.url), "utf8"),
    readFile(new URL("../drizzle/0001_young_warstar.sql", import.meta.url), "utf8"),
    readFile(new URL("../app/forgot-password/forgot-password-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/reset-password/reset-password-form.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/account/account-settings.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/privacy/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/terms/page.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(authConfig, /requireEmailVerification: true/);
  assert.match(authConfig, /sendVerificationEmail/);
  assert.match(authConfig, /sendOnSignUp: true/);
  assert.match(authConfig, /sendOnSignIn: true/);
  assert.match(authConfig, /resetPasswordTokenExpiresIn: 30 \* 60/);
  assert.match(authConfig, /revokeSessionsOnPasswordReset: true/);
  assert.match(authConfig, /sendDeleteAccountVerification/);
  assert.match(authConfig, /deleteTokenExpiresIn: 60 \* 60/);
  assert.match(authConfig, /"\/request-password-reset"/);
  assert.match(authConfig, /"\/send-verification-email"/);
  assert.match(authGate, /authClient\.sendVerificationEmail/);
  assert.match(authGate, /href="\/forgot-password"/);
  assert.match(authGate, /href="\/terms"/);
  assert.match(authGate, /href="\/privacy"/);
  assert.match(authGate, /termsAccepted/);
  assert.match(authClient, /inferAdditionalFields/);
  assert.match(email, /https:\/\/api\.resend\.com\/emails/);
  assert.match(email, /RESEND_API_KEY/);
  assert.match(email, /process\.env\.NODE_ENV !== "production"/);
  assert.match(schema, /termsAccepted/);
  assert.match(schema, /termsAcceptedAt/);
  assert.match(schema, /termsVersion/);
  assert.match(migration, /terms_accepted/);
  assert.match(forgotPassword, /authClient\.requestPasswordReset/);
  assert.match(forgotPassword, /response is the same|If an account exists/);
  assert.match(resetPassword, /authClient\.resetPassword/);
  assert.match(resetPassword, /invalid or has expired/);
  assert.match(accountSettings, /authClient\.deleteUser/);
  assert.match(accountSettings, /password/);
  assert.match(accountSettings, /confirmation !== "DELETE"/);
  assert.match(privacy, /We do\s+not sell personal information/);
  assert.match(privacy, /Retention and deletion/);
  assert.match(privacy, /Your privacy rights/);
  assert.match(terms, /not FAA-approved training/);
  assert.match(terms, /Limitation of liability/);
  assert.match(terms, /Governing law and disputes/);
});

test("uses the playable KSMO scope geometry in the airport preview", async () => {
  const [carousel, simulator, airport, airports, css] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ksmo-airport.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /airportFor\(airportCode\)/);
  assert.match(carousel, /PLAYABLE_AIRPORTS\[airport\.code as AirportCode\]/);
  assert.match(carousel, /previewAirport\.runways\.map/);
  assert.match(carousel, /previewAirport\.runwayEnds\[runway\.ends\[0\]\]/);
  assert.match(carousel, /viewBox="0 0 100 100"/);
  assert.match(carousel, /airport-preview-ring-three/);
  assert.match(carousel, /RADAR PREVIEW/);
  assert.match(carousel, /NOT YET AVAILABLE/);
  assert.match(airport, /designation: "03\/21"/);
  assert.match(airport, /threshold: \{ x: 51\.13, y: 48\.33 \}/);
  assert.match(airport, /threshold: \{ x: 48\.87, y: 51\.67 \}/);
  const ksmoDefinition = airports.slice(
    airports.indexOf("export const KSMO_AIRPORT"),
    airports.indexOf("// Runway coordinates"),
  );
  assert.match(airports, /STANDARD_TERMINAL_SCOPE_RANGE_NM = 18/);
  assert.match(
    ksmoDefinition,
    /scopeRangeNm: STANDARD_TERMINAL_SCOPE_RANGE_NM/,
  );
  assert.match(css, /\.airport-preview-runway-layer/);
  assert.match(css, /\.airport-preview-runway-surface/);
  assert.match(css, /\.airport-preview-boundary/);
  assert.doesNotMatch(css, /\.airport-focus-runway/);
});

test("unlocks a researched four-runway KLAX level and aircraft mix", async () => {
  const [carousel, route, airports, simulator, css] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/airports/klax/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(new URL("../public/klax-terminal-satellite.jpg", import.meta.url)),
  ]);

  assert.match(carousel, /href: "\/airports\/klax"/);
  assert.match(route, /<RadarSimulator airportCode="KLAX" \/>/);
  assert.match(route, /await requireSession\(\)/);
  assert.match(airports, /designation: "06L\/24R"/);
  assert.match(airports, /designation: "06R\/24L"/);
  assert.match(airports, /designation: "07L\/25R"/);
  assert.match(airports, /designation: "07R\/25L"/);
  assert.equal(
    airports.match(/scopeRangeNm: STANDARD_TERMINAL_SCOPE_RANGE_NM/g)?.length,
    3,
  );
  assert.match(airports, /threshold: \{ x: 43\.57, y: 46\.53 \}/);
  assert.match(airports, /threshold: \{ x: 57\.02, y: 52\.26 \}/);
  assert.match(airports, /westFlowArrivalRunways: \["24R", "25L"\]/);
  assert.match(airports, /westFlowDepartureRunways: \["24L", "25R"\]/);
  for (const type of ["A21N", "B38M", "B739", "B789", "B77W", "A359", "A388", "B763", "CRJ7", "B748"]) {
    assert.match(simulator, new RegExp(`${type}: \\{`));
  }
  assert.match(simulator, /terminalSpeedKnots/);
  assert.match(simulator, /cruiseSpeedKnots/);
  assert.match(simulator, /function sharesPhysicalRunway/);
  assert.match(css, /klax-terminal-satellite\.jpg/);
});

test("adds a researched eight-runway KORD extreme-traffic level", async () => {
  const [carousel, route, airports, simulator, css] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/airports/kord/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(new URL("../public/kord-terminal-satellite.jpg", import.meta.url)),
  ]);

  assert.match(carousel, /href: "\/airports\/kord"/);
  assert.match(carousel, /code: "KORD"[\s\S]*runway: "8 runways"/);
  assert.match(carousel, /traffic: "Very Heavy"/);
  assert.match(carousel, /difficulty: "Extreme"/);
  assert.match(route, /<RadarSimulator airportCode="KORD" \/>/);
  assert.match(route, /await requireSession\(\)/);
  for (const runway of [
    "04L/22R",
    "04R/22L",
    "09C/27C",
    "09L/27R",
    "09R/27L",
    "10C/28C",
    "10L/28R",
    "10R/28L",
  ]) {
    assert.match(airports, new RegExp(`designation: "${runway.replace("/", "\\/")}"`));
  }
  assert.match(airports, /threshold: \{ x: 45\.41, y: 37\.34 \}/);
  assert.match(airports, /threshold: \{ x: 51\.95, y: 59\.63 \}/);
  assert.match(
    airports,
    /westFlowArrivalRunways: \["27R", "27C", "27L", "28C"\]/,
  );
  assert.match(airports, /westFlowDepartureRunways: \["28R", "22L"\]/);
  assert.match(airports, /airport: "KORD"[\s\S]*runwayCount: 6/);
  for (const type of ["CRJ2", "BCS3", "A320", "B712", "B752", "A333"]) {
    assert.match(simulator, new RegExp(`${type}: \\{`));
  }
  assert.match(css, /kord-terminal-satellite\.jpg/);
  assert.match(css, /\.airport-map-kord \.runway-outline/);
});

test("offers a complete keyboard-accessible how-to-play briefing", async () => {
  const [carousel, css, layout] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(carousel, />\s*How to play\s*<\/button>/);
  assert.match(carousel, /showHowToPlay/);
  assert.match(carousel, /event\.key === "Escape"/);
  assert.match(carousel, /aria-modal="true"/);
  assert.match(carousel, /role="dialog"/);
  assert.match(carousel, /aria-label="Close how to play"/);
  assert.match(carousel, /event\.currentTarget === event\.target/);
  assert.match(carousel, /at least 1,000/);
  assert.match(carousel, /feet laterally or 1,000 feet vertically/);
  assert.match(carousel, /1,000 feet vertically/);
  assert.match(carousel, /inside 500 feet laterally and vertically/);
  assert.match(carousel, /third incorrect handoff ends the shift/);
  assert.match(carousel, /3,000 feet AGL or lower/);
  assert.match(carousel, /heading less than 90°/);
  assert.match(carousel, /N4382K C 5 C MALIBU T/);
  assert.match(carousel, /HELP · SCALE · STATS · EXIT/);
  assert.match(carousel, /HDG, ALT, DIRECT, SPEED, APP, LAND, HOLD, ABORT, TAXI, and QUIT/);
  assert.match(carousel, /Commands remain available/);
  assert.match(carousel, /\+100 safe landing/);
  assert.match(css, /\.how-to-play-trigger/);
  assert.match(css, /\.how-to-backdrop/);
  assert.match(css, /\.how-to-command-grid/);
  assert.match(css, /\.how-to-rule-grid/);
  assert.match(layout, /Playfair_Display/);
  assert.match(layout, /--font-playfair-display/);
  assert.match(css, /\.how-to-modal[\s\S]*font-family: var\(--font-playfair-display\)/);
});

test("includes terminal-scope completion and handoff behavior", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    access(
      new URL(
        "../public/ksmo-terminal-satellite.jpg",
        import.meta.url,
      ),
    ),
  ]);

  assert.match(simulator, /airport\.exitFixes\.find/);
  assert.match(simulator, /Touchdown Runway \$\{next\.runway \?\? airport\.westFlowArrivalRunways\[0\]\}, rolling out/);
  assert.match(
    simulator,
    /Incorrect handoff — left controlled airspace without reaching/,
  );
  assert.match(simulator, /\["DCT", "DIRECT"\]/);
  assert.match(simulator, /appendGroundTrackSample/);
  assert.match(css, /ksmo-terminal-satellite\.jpg/);
  assert.match(css, /\.history-group \.history-segment/);
  assert.match(css, /\.flight-strip\.departure/);
});

test("keeps horizontal exit labels inside the radar viewport", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.exit-marker\.edge-west\s*\{[^}]*transform:\s*translate\(0, -50%\)/s,
  );
  assert.match(
    css,
    /\.exit-marker\.edge-east\s*\{[^}]*transform:\s*translate\(-100%, -50%\)/s,
  );
});

test("shows an aviation heading compass in the lower-left radar corner", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /COMPASS_HEADINGS/);
  assert.match(simulator, /Heading compass\. North is 000 degrees/);
  assert.match(simulator, /String\(heading\)\.padStart\(3, "0"\)/);
  assert.match(css, /\.heading-compass\s*\{[^}]*left:\s*20px;[^}]*bottom:\s*20px/s);
  assert.match(css, /\.heading-compass-mark/);
});

test("uses stabilized final speeds and a visible braking rollout", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /\| "LANDING_ROLL"/);
  assert.match(simulator, /finalApproachSpeed:\s*65/);
  assert.match(simulator, /landingRollFeet:\s*575/);
  assert.match(simulator, /function landingDecelerationKnotsPerSecond/);
  assert.match(simulator, /kinematicDecelerationKnotsPerSecond/);
  assert.match(simulator, /brakingResponse/);
  assert.match(simulator, /next\.targetSpeed = performanceFor\(next\)\.finalApproachSpeed/);
  assert.match(simulator, /const approachTravel = Math\.min\(dist, travel\)/);
  assert.match(simulator, /next\.status = "LANDING_ROLL"/);
  assert.match(simulator, /next\.landingDistanceFeet = 0/);
  assert.match(simulator, /next\.landingDistanceFeet \/ \(physicalRunway\?\.lengthFeet \?\? 3500\)/);
  assert.match(simulator, /next\.speed <= 0\.5/);
  assert.match(simulator, /Clear of Runway \$\{next\.runway \?\? airport\.westFlowArrivalRunways\[0\]\}/);
  assert.doesNotMatch(
    simulator,
    /next\.status = "LANDED";\s*next\.altitude = 177;\s*next\.targetAltitude = 177;\s*next\.speed = 0/s,
  );
});

test("rejects speed commands below every aircraft maneuver minimum", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.equal(
    simulator.match(/minimumManeuverSpeedKnots:\s*\d+/g)?.length,
    24,
  );
  assert.match(
    simulator,
    /C172:\s*\{[^}]*minimumManeuverSpeedKnots:\s*80/s,
  );
  assert.match(
    simulator,
    /B738:\s*\{[^}]*minimumManeuverSpeedKnots:\s*170/s,
  );
  assert.match(
    simulator,
    /B748:\s*\{[^}]*minimumManeuverSpeedKnots:\s*180/s,
  );
  assert.match(simulator, /if \(speed < minimumSpeed\)/);
  assert.match(simulator, /normal-flight minimum is \$\{minimumSpeed\} knots/);
  assert.match(simulator, /flight\.targetSpeed = speed/);
  assert.doesNotMatch(simulator, /clamp\(\s*speed,\s*60/s);
});

test("uses timestamped ground-track history with a fading fixed-time trail", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /TRACK_SAMPLE_SECONDS = 1/);
  assert.match(simulator, /TRACK_HISTORY_SECONDS = 15/);
  assert.match(simulator, /groundSpeed:\s*number/);
  assert.match(simulator, /groundTrack:\s*number/);
  assert.match(simulator, /function groundMotionBetween/);
  assert.match(simulator, /next\.groundSpeed =\s*instantaneousMotion\.groundSpeed/s);
  assert.match(simulator, /function smoothGroundTrack/);
  assert.match(simulator, /tick - point\.tick <= TRACK_HISTORY_TICKS/);
  assert.match(simulator, /className="history-segment"/);
  assert.match(simulator, /opacity=\{0\.12 \+ recency \* 0\.72\}/);
  assert.doesNotMatch(simulator, /track\.slice\(-13\)/);
  assert.match(css, /stroke-linecap:\s*round/);
  assert.match(css, /vector-effect:\s*non-scaling-stroke/);
});

test("maps displayed ground speed linearly to real-time screen movement", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /function scopeNmPerWorldUnit/);
  assert.match(simulator, /airportFor\(airportCode\)\.scopeRangeNm \/ 100/);
  assert.match(
    simulator,
    /elapsedHoursPerTick = 1 \/ SIMULATION_TICKS_PER_SECOND \/ 3600/,
  );
  assert.match(
    simulator,
    /nauticalMilesPerTick = speedKnots \* elapsedHoursPerTick/,
  );
  assert.match(simulator, /airborneAccelerationKnotsPerSecond/);
  assert.match(simulator, /function groundTravelForKnots/);
  assert.match(simulator, /groundTravelForKnots\(next\.speed, next\.airport\)/);
  assert.match(simulator, /groundSpeed = \(distanceNm \* 3600\) \/ elapsedSeconds/);
  assert.match(
    simulator,
    /Math\.round\(currentGroundMotion\(flight\)\.groundSpeed\)\}KT/,
  );
  assert.match(
    simulator,
    /function groundTravelForKnots\(speedKnots: number, airportCode: AirportCode\)/,
  );
  assert.match(
    simulator,
    /return worldUnitsForNauticalMiles\(nauticalMilesPerTick, airportCode\)/,
  );
  assert.match(simulator, /next\.groundSpeed = instantaneousMotion\.groundSpeed/);
  assert.doesNotMatch(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.doesNotMatch(simulator, /BACKGROUND_MOVEMENT_SCALE/);
  assert.doesNotMatch(
    simulator,
    /groundTravelForKnots\(Math\.max\(next\.speed/,
  );
  assert.doesNotMatch(simulator, /next\.speed \/ 5000/);
  assert.doesNotMatch(simulator, /Math\.max\(next\.speed, 8\) \/ 4800/);
});

test("uses speed- and aircraft-dependent coordinated turn dynamics", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /STANDARD_RATE_TURN_DEGREES_PER_SECOND = 3/);
  assert.match(simulator, /COORDINATED_TURN_RATE_FACTOR = 1091/);
  assert.match(simulator, /PA28:\s*30/);
  assert.match(simulator, /C172:\s*30/);
  assert.match(simulator, /B738:\s*25/);
  assert.match(simulator, /function turnDegreesPerTick\(flight: Aircraft\)/);
  assert.match(simulator, /Math\.tan\(\(bankLimit \* Math\.PI\) \/ 180\)/);
  assert.match(
    simulator,
    /Math\.min\(STANDARD_RATE_TURN_DEGREES_PER_SECOND, coordinatedRate\)/,
  );
  assert.match(
    simulator,
    /turnTowardDirected\(\s*next\.heading,\s*next\.targetHeading,\s*turnDegreesPerTick\(next\)/s,
  );
  assert.doesNotMatch(
    simulator,
    /turnTowardDirected\(\s*next\.heading,\s*next\.targetHeading,\s*0\.8/s,
  );
});

test("offers fixed whole-simulation speed controls in the sidebar footer", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /SIMULATION_SPEEDS = \[1, 1\.5, 2, 3, 4\] as const/);
  assert.match(simulator, /const \[speedIndex, setSpeedIndex\] = useState\(0\)/);
  assert.match(
    simulator,
    /SIMULATION_TICKS_PER_SECOND \*\s*simulationSpeed/s,
  );
  assert.match(
    simulator,
    /\[paused, simulationSpeed, simulationFailed\]/,
  );
  assert.match(simulator, /aria-label="Simulation speed"/);
  assert.match(simulator, /Real life speed/);
  assert.doesNotMatch(simulator, /Reset seed 0321/);
  assert.doesNotMatch(simulator, /Deterministic replay · build 0\.1/);
  assert.match(css, /\.simulation-speed-slider/);
  assert.match(css, /\.speed-scale/);
});

test("reconciles elapsed wall time after browser background throttling", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /MAX_CATCH_UP_TICKS_PER_PASS/);
  assert.match(simulator, /lastSimulationUpdateRef/);
  assert.match(simulator, /pendingSimulationTicksRef/);
  assert.match(simulator, /function advanceWorldByTicks/);
  assert.match(simulator, /const elapsedSeconds = Math\.max\(0, \(now - previousUpdate\) \/ 1000\)/);
  assert.match(
    simulator,
    /elapsedSeconds \*\s*SIMULATION_TICKS_PER_SECOND \*\s*simulationSpeed/s,
  );
  assert.match(
    simulator,
    /advanceWorldByTicks\(current, ticksToAdvance\)/,
  );
  assert.match(
    simulator,
    /document\.addEventListener\("visibilitychange", advanceToWallClock\)/,
  );
  assert.match(
    simulator,
    /window\.addEventListener\("focus", advanceToWallClock\)/,
  );
  assert.match(simulator, /window\.setInterval\(advanceToWallClock, 250\)/);
  assert.doesNotMatch(
    simulator,
    /setInterval\(\(\) => \{\s*setWorld\(\(current\) => stepWorld\(current\)\)/s,
  );
});

test("stops the shift and explains the final score after a collision", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /type SimulationFailure/);
  assert.match(simulator, /COLLISION_DISTANCE_FEET = 500/);
  assert.match(
    simulator,
    /COLLISION_DISTANCE_FEET \/ FEET_PER_NAUTICAL_MILE/,
  );
  assert.match(simulator, /COLLISION_VERTICAL_FEET = 500/);
  assert.match(simulator, /if \(previous\.failure\) return previous/);
  assert.match(
    simulator,
    /lateral <= COLLISION_LATERAL_NM &&\s*vertical <= COLLISION_VERTICAL_FEET/s,
  );
  assert.match(simulator, /kind: "collision"/);
  assert.match(simulator, /finalScore/);
  assert.match(simulator, /COLLISION · \$\{airborne\[i\]\.callsign\}/);
  assert.match(simulator, /const simulationFailed = Boolean\(world\.failure\)/);
  assert.match(simulator, /if \(paused \|\| simulationFailed\)/);
  assert.match(simulator, /role="alertdialog"/);
  assert.match(simulator, /Aircraft collision/);
  assert.match(simulator, /lateralSeparationFeet/);
  assert.match(simulator, /The simulation has been stopped/);
  assert.match(simulator, /Final score/);
  assert.match(simulator, /Start new shift/);
  assert.match(css, /\.failure-modal/);
  assert.match(css, /\.failure-summary/);
  assert.match(css, /\.failure-restart/);
});

test("highlights aircraft only inside the close-proximity warning radius", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /const conflictedCallsigns = useMemo/);
  assert.match(simulator, /LOSS_OF_SEPARATION_LATERAL_FEET = 1000/);
  assert.match(
    simulator,
    /LOSS_OF_SEPARATION_LATERAL_FEET \/ FEET_PER_NAUTICAL_MILE/,
  );
  assert.match(simulator, /LOSS_OF_SEPARATION_VERTICAL_FEET = 1000/);
  assert.match(
    simulator,
    /lateral < LOSS_OF_SEPARATION_LATERAL_NM &&\s*vertical < LOSS_OF_SEPARATION_VERTICAL_FEET/s,
  );
  assert.match(simulator, /result\.add\(airborne\[i\]\.callsign\)/);
  assert.match(simulator, /result\.add\(airborne\[j\]\.callsign\)/);
  assert.match(
    simulator,
    /conflictedCallsigns\.has\(flight\.callsign\) \? "conflict" : ""/,
  );
  assert.doesNotMatch(simulator, /CONFLICT PREDICTION/);
  assert.doesNotMatch(simulator, /lateral < 4\.5/);
  assert.doesNotMatch(simulator, /className="conflict-banner"/);
  assert.match(css, /\.aircraft-target\.conflict \.data-tag/);
  assert.match(css, /\.aircraft-target\.conflict \.target-chevron/);
  assert.doesNotMatch(css, /\.conflict-banner/);
  assert.match(
    simulator,
    /A loss of separation is recorded when aircraft are both less\s*than 1,000 ft apart laterally and less than 1,000 ft apart\s*vertically/s,
  );
  assert.match(
    simulator,
    /A collision immediately ends the game when aircraft are both\s*within 500 ft laterally and within 500 ft vertically/s,
  );
  assert.match(simulator, /The third\s*incorrect handoff also ends the game/s);
  assert.doesNotMatch(simulator, /Maintain 3 NM or 1,000 ft/);
});

test("uses hollow aircraft targets without a forward heading line", async () => {
  const css = await readFile(
    new URL("../app/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(
    css,
    /\.target-chevron\s*\{[^}]*background:\s*transparent/s,
  );
  assert.match(css, /\.target-chevron\s*\{[^}]*border:\s*1px solid #fff/s);
  assert.match(css, /\.target-chevron\s*\{[^}]*box-shadow:\s*none/s);
  assert.match(
    css,
    /\.aircraft-target\.selected \.target-chevron\s*\{[^}]*border-color:\s*#fff/s,
  );
  assert.match(
    css,
    /\.target-chevron::after,\s*\.target-chevron::before\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*background:\s*transparent/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*border-color:\s*#ff7469/s,
  );
  assert.match(
    css,
    /\.aircraft-target\.conflict \.target-chevron\s*\{[^}]*box-shadow:\s*none/s,
  );
  assert.doesNotMatch(css, /\.target-chevron::after\s*\{\s*content:/s);
});

test("shows climb and descent arrows beside radar altitude", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /function altitudeTrendSymbol\(flight: Aircraft\)/);
  assert.match(
    simulator,
    /flight\.targetAltitude > flight\.altitude \+ 30\) return "↑"/,
  );
  assert.match(
    simulator,
    /flight\.targetAltitude < flight\.altitude - 30\) return "↓"/,
  );
  assert.match(
    simulator,
    /\{altitudeLabel\(flight\.altitude\)\}\s*\{altitudeTrendSymbol\(flight\)\} ·/,
  );
  assert.match(simulator, /function altitudeTrendLabel\(flight: Aircraft\)/);
  assert.match(
    simulator,
    /altitude \$\{Math\.round\(flight\.altitude\)\} feet, \$\{altitudeTrendLabel\(flight\)\}/,
  );
});

test("fails on the third incorrect departure handoff", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /incorrectHandoffs:\s*number/);
  assert.match(simulator, /incorrectHandoffs:\s*0/);
  assert.match(simulator, /INCORRECT_HANDOFF_LIMIT = 3/);
  assert.match(
    simulator,
    /const incorrectHandoffs = world\.incorrectHandoffs \+ 1/,
  );
  assert.match(
    simulator,
    /incorrectHandoffs >= INCORRECT_HANDOFF_LIMIT/,
  );
  assert.match(simulator, /kind: "handoff_limit"/);
  assert.match(simulator, /Incorrect handoff — left controlled airspace/);
  assert.match(simulator, /HANDOFF FAILURE/);
  assert.match(simulator, /Handoff limit exceeded/);
  assert.match(
    simulator,
    /Three departures left controlled airspace/,
  );
  assert.match(simulator, /world\.incorrectHandoffs\}\/3<\/strong> handoff errors/);
});

test("earns the overall score only from safe landings and handoffs", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /score:\s*0/);
  assert.match(simulator, /safeLandings:\s*0/);
  assert.match(simulator, /safeHandoffs:\s*0/);
  assert.match(simulator, /SAFE_LANDING_POINTS = 100/);
  assert.match(simulator, /SAFE_HANDOFF_POINTS = 100/);
  assert.match(simulator, /world\.safeLandings \+= 1/);
  assert.match(simulator, /world\.score \+= SAFE_LANDING_POINTS/);
  assert.match(simulator, /world\.safeHandoffs \+= 1/);
  assert.match(simulator, /world\.score \+= SAFE_HANDOFF_POINTS/);
  assert.match(simulator, /className="score-total"/);
  assert.match(simulator, />SCORE</);
  assert.match(simulator, /safe landings/);
  assert.match(simulator, /safe handoffs/);
  assert.doesNotMatch(simulator, />OVERALL SCORE</);
  assert.doesNotMatch(simulator, />SHIFT SCORE</);
  assert.doesNotMatch(simulator, /COLLISION_SCORE_PENALTY/);
  assert.doesNotMatch(simulator, /INCORRECT_HANDOFF_PENALTY/);
});

test("keeps the score summary in one compact horizontal row", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /> landed/);
  assert.match(simulator, /> handed off/);
  assert.match(simulator, /> handoff errors/);
  assert.match(
    css,
    /\.score-card\s*\{[^}]*min-height:\s*34px[^}]*display:\s*flex[^}]*align-items:\s*center/s,
  );
  assert.match(
    css,
    /\.score-metrics\s*\{[^}]*display:\s*flex[^}]*justify-content:\s*space-between/s,
  );
  assert.match(css, /\.score-metrics span\s*\{[^}]*white-space:\s*nowrap/s);
  assert.doesNotMatch(css, /\.score-card\s*\{[^}]*grid-template-columns/s);
});

test("warns before a refresh would discard shift progress", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /const warnAboutLostProgress = \(event: BeforeUnloadEvent\)/);
  assert.match(simulator, /event\.preventDefault\(\)/);
  assert.match(simulator, /event\.returnValue = ""/);
  assert.match(
    simulator,
    /window\.addEventListener\("beforeunload", warnAboutLostProgress\)/,
  );
  assert.match(
    simulator,
    /window\.removeEventListener\("beforeunload", warnAboutLostProgress\)/,
  );
});

test("confirms before the simulator header returns to airport selection", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /showFinishConfirm/);
  assert.match(simulator, /event\.preventDefault\(\)/);
  assert.match(simulator, /Finish simulation\?/);
  assert.match(simulator, /role="alertdialog"/);
  assert.match(simulator, /aria-describedby="finish-simulation-description"/);
  assert.match(simulator, /Keep playing/);
  assert.match(simulator, /Finish simulation/);
  assert.match(simulator, /className="primary-button finish-confirm-button"/);
  assert.match(simulator, /href="\/"\s*replace/s);
  assert.match(simulator, /setShowFinishConfirm\(false\)/);
  assert.match(css, /\.finish-modal/);
  assert.match(css, /\.finish-actions/);
  assert.match(css, /\.finish-confirm-button/);
});

test("aligns departures to their assigned physical runway and uses its full length before vectoring", async () => {
  const [simulator, airport, airports, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ksmo-airport.ts", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /runway\?: string/);
  assert.match(simulator, /function runwayEndFor/);
  assert.match(airport, /designation:\s*"03\/21"/);
  assert.match(airport, /"21":\s*\{[^}]*heading:\s*210/s);
  assert.match(airport, /"03":\s*\{[^}]*heading:\s*30/s);
  assert.match(airports, /runway: "03"/);
  assert.match(
    simulator,
    /const travel = groundTravelForKnots\(next\.speed, next\.airport\)/,
  );
  assert.doesNotMatch(simulator, /TAKEOFF_ROLL_MOVEMENT_SCALE/);
  assert.match(simulator, /function hasPassedRunwayDepartureEnd/);
  assert.match(simulator, /return runwayProgress >= 1/);
  assert.match(simulator, /const clearOfRunway = hasPassedRunwayDepartureEnd\(next\)/);
  assert.match(
    simulator,
    /next\.altitude >=\s*airport\.elevation \+ INITIAL_TURN_MINIMUM_AGL_FEET/s,
  );
  assert.match(simulator, /next\.speed >= minimumTurnSpeed/);
  assert.match(
    simulator,
    /next\.departureClimbTicks >= INITIAL_TURN_MINIMUM_CLIMB_TICKS/,
  );
  assert.match(
    simulator,
    /next\.departureHeading !== undefined &&\s*clearOfRunway &&\s*stableInitialClimb/s,
  );
  assert.match(simulator, /next\.targetHeading = runwayEndFor\(next\)\.heading/);
  assert.doesNotMatch(simulator, /next\.speed >= 72 \|\| dist < 2/);
  assert.match(simulator, /className="runway-layer"/);
  assert.match(simulator, /normalizeRunwayEnd/);
  assert.match(simulator, /Unknown runway \$\{runwayToken\}; use \$\{Object\.keys\(airport\.runwayEnds\)\.join/);
  assert.doesNotMatch(simulator, /ACTIVE END/);
  assert.doesNotMatch(simulator, /RECIPROCAL/);
  assert.match(css, /\.runway-layer/);
  assert.match(css, /\.runway-end-label/);
  const runwayLabel =
    css.match(/\.runway-end-label\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(runwayLabel, /\bborder\s*:|\bbackground\s*:/);
});

test("stages lineup, takeoff power, and progressive runway acceleration", async () => {
  const simulator = await readFile(
    new URL("../app/simulator.tsx", import.meta.url),
    "utf8",
  );

  assert.match(simulator, /\| "LINING_UP"/);
  assert.match(simulator, /\| "TAKEOFF_READY"/);
  assert.match(
    simulator,
    /LINE_UP_DELAY_SECONDS = 1\.5/,
  );
  assert.match(
    simulator,
    /LINE_UP_TICKS = Math\.round\(\s*SIMULATION_TICKS_PER_SECOND \* LINE_UP_DELAY_SECONDS/s,
  );
  assert.match(
    simulator,
    /TAKEOFF_POWER_TICKS = SIMULATION_TICKS_PER_SECOND/,
  );
  assert.match(simulator, /takeoffGroundRollFeet:\s*960/);
  assert.match(simulator, /rotationSpeed:\s*55/);
  assert.match(simulator, /rotationSpeed:\s*82/);
  assert.match(simulator, /climbRateFeetPerMinute:\s*1920/);
  assert.match(simulator, /function takeoffAccelerationKnotsPerSecond/);
  assert.match(simulator, /kinematicAccelerationKnotsPerSecond/);
  assert.match(simulator, /aerodynamicTaper/);
  assert.match(simulator, /flight\.status = "LINING_UP"/);
  assert.match(simulator, /next\.status = "TAKEOFF_READY"/);
  assert.match(simulator, /next\.status = "TAKEOFF_ROLL"/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_AGL_FEET = 500/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_CLIMB_SECONDS = 8/);
  assert.match(simulator, /INITIAL_TURN_MINIMUM_SPEED_FACTOR = 1\.15/);
  assert.match(simulator, /next\.departureClimbTicks = 0/);
  assert.match(
    simulator,
    /!\["HOLD_SHORT", "LINING_UP"\]\.includes\(flight\.status\)/,
  );
  assert.match(
    simulator,
    /next\.speed = moveToward\(\s*next\.speed,\s*performance\.rotationSpeed,\s*takeoffAccelerationKnotsPerSecond\(next\)/s,
  );
  assert.match(simulator, /next\.targetSpeed = performance\.initialClimbSpeed/);
  assert.match(simulator, /next\.targetAltitude = Math\.max\(\s*next\.targetAltitude,\s*airport\.elevation \+ 2500/s);
  assert.doesNotMatch(simulator, /TAKEOFF_ACCELERATION_PER_TICK|targetSpeed = 78/);
  assert.doesNotMatch(simulator, /flight\.status = "TAKEOFF_ROLL"/);
  assert.match(simulator, /line up and wait/i);
  assert.match(simulator, /set takeoff power/i);
});

test("pause is a planning state with compact, boxless traffic displays", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /if \(paused\) \{/);
  assert.match(simulator, /Clearance queued for resume/);
  assert.match(simulator, /queuedCommands\.reduce/);
  assert.match(simulator, /Traffic and clock frozen/);
  assert.match(simulator, /<small>CALLSIGN<\/small>/);
  assert.match(simulator, /<small>ALT<\/small>/);
  assert.match(simulator, /<small>HDG<\/small>/);
  assert.match(simulator, /<small>SPD<\/small>/);
  assert.match(simulator, /flight\.kind === "departure"/);
  assert.match(simulator, /<small>TO<\/small>/);
  assert.match(simulator, /flight\.exitFix \?\? "TBD"/);
  assert.doesNotMatch(simulator, /flightCardRoute/);
  assert.doesNotMatch(simulator, /<b>\{flight\.kind/);

  const dataTag = css.match(/\.data-tag\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(dataTag, /\bbackground\s*:|\bborder(?:-\w+)?\s*:|\boutline\s*:/);
  assert.match(simulator, /className="pause-indicator"/);
  assert.doesNotMatch(simulator, /className="pause-overlay"/);
  assert.doesNotMatch(simulator, /Resume shift/);
  assert.match(css, /\.pause-indicator\s*\{[^}]*top:\s*12px/s);
  assert.match(css, /\.pause-indicator\s*\{[^}]*pointer-events:\s*none/s);
  assert.doesNotMatch(css, /\.pause-overlay|\.pause-card/);
  assert.match(css, /\.flight-strip\s*\{[^}]*min-height:\s*68px/s);
  assert.match(css, /\.flight-strip\.arrival\s*\{[^}]*grid-template-columns/s);
  assert.match(css, /\.strip-cell\s*\{[^}]*border-right/s);
  assert.match(css, /\.strip-altitude strong\s*\{[^}]*#80d88c/s);
  assert.match(css, /\.strip-destination strong\s*\{[^}]*#8fd7ff/s);
});

test("uses ATC-SIM shorthand and boundary-based traffic lifecycle rules", async () => {
  const [simulator, airports] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /aircraft:\s*\[\]/);
  assert.match(airports, /x:\s*0\.6/);
  assert.match(simulator, /status:\s*"HOLD_SHORT"/);
  assert.doesNotMatch(simulator, /const SPAWN_SCHEDULE/);
  assert.match(simulator, /FIRST_TRAFFIC_MIN_SECONDS = 6/);
  assert.match(simulator, /FIRST_TRAFFIC_MAX_SECONDS = 10/);
  assert.match(simulator, /randomizedFirstTrafficTick/);
  assert.match(
    simulator,
    /!\["HOLD_SHORT", "LINING_UP"\]\.includes\(flight\.status\)/,
  );
  assert.match(simulator, /departureAltitudeAssigned/);
  assert.match(simulator, /Assign a departure altitude with C before takeoff/);
  assert.match(simulator, /while \(cursor < tokens\.length\)/);
  assert.match(simulator, /\^\\d\{3\}\$/);
  assert.match(simulator, /\["W", "LW", "LUAW"\]/);
  assert.match(simulator, /above 3,000 feet AGL/);
  assert.match(simulator, /LANDING_INTERCEPT_MAX_ANGLE_DEGREES = 90/);
  assert.match(
    simulator,
    /angularDifference\(flight\.heading, runway\.heading\) >=\s*LANDING_INTERCEPT_MAX_ANGLE_DEGREES/s,
  );
  assert.match(simulator, /heading must be less than 90°/);
  assert.doesNotMatch(simulator, /heading must be within 60°/);
  assert.match(simulator, /Invalid heading \$\{clearance\}; use 000 through 359/);
  assert.match(simulator, /!other\.completed/);
  assert.match(simulator, /globalCommand === "HELP"/);
  assert.match(simulator, /globalCommand === "SCALE"/);
  assert.match(simulator, /globalCommand === "STATS"/);
  assert.match(simulator, /pacific-radar-high-scores/);
  assert.match(simulator, /altitudeLabel\(flight\.targetAltitude\)/);
  assert.match(simulator, /clearedHeading\(flight\)/);
  assert.match(simulator, /setCommand\(`\$\{flight\.callsign\} `\)/);
});

test("scales balanced traffic to each airport's runway capacity", async () => {
  const [simulator, airports] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/airports.ts", import.meta.url), "utf8"),
  ]);

  assert.match(airports, /export type AirportTrafficProfile/);
  assert.match(airports, /airport: "KSMO"/);
  assert.match(airports, /runwayCount: 1/);
  assert.match(airports, /initialSpacingSeconds: 60/);
  assert.match(airports, /minimumSpacingSeconds: 36/);
  assert.match(airports, /airport: "KLAX"/);
  assert.match(airports, /runwayCount: 4/);
  assert.match(airports, /initialSpacingSeconds: 30/);
  assert.match(airports, /minimumSpacingSeconds: 22/);
  assert.match(simulator, /TRAFFIC_INTERVAL_JITTER = 0\.38/);
  assert.match(simulator, /ABSOLUTE_MIN_TRAFFIC_SPACING_SECONDS = 24/);
  assert.match(simulator, /function continuousTrafficIntervalTicks/);
  assert.match(simulator, /function trafficRandomUnit/);
  assert.match(simulator, /window\.crypto\.getRandomValues/);
  assert.match(simulator, /function randomizedTrafficIntervalTicks/);
  assert.match(
    simulator,
    /trafficRandomUnit\(seed, sequence\) \* TRAFFIC_INTERVAL_JITTER \* 2/,
  );
  assert.match(
    simulator,
    /sequence \/ airport\.traffic\.rampEveryMovements/,
  );
  assert.match(
    simulator,
    /airport\.traffic\.spacingReductionSeconds/,
  );
  assert.match(simulator, /function createContinuousTraffic/);
  assert.match(
    simulator,
    /sequence % 2 === 0 \? "departure" : "arrival"/,
  );
  assert.match(simulator, /if \(world\.tick >= world\.nextTrafficTick\)/);
  assert.match(simulator, /trafficSequence: world\.trafficSequence \+ 1/);
  assert.match(
    simulator,
    /randomizedTrafficIntervalTicks\(\s*world\.trafficSequence \+ 1,\s*world\.trafficSeed/s,
  );
  assert.match(simulator, /stepped\.filter\(\(flight\) => !flight\.completed\)/);
  assert.doesNotMatch(
    simulator,
    /world\.aircraft\.length\s*[<>=]+\s*\d+[^}]*createContinuousTraffic/s,
  );
});

test("keeps the clearance console in the sidebar and gives the radar full height", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  const sidebarIndex = simulator.indexOf('<aside className="side-panel">');
  const commandIndex = simulator.indexOf('className="command-deck"');
  assert.ok(sidebarIndex >= 0);
  assert.ok(commandIndex > sidebarIndex);
  assert.match(simulator, /aria-label="Clearance console"/);
  assert.match(css, /\.top-bar\s*\{[^}]*min-height:\s*54px/s);
  assert.match(css, /\.radar-map\s*\{[^}]*height:\s*100%/s);
  assert.match(
    css,
    /\.side-panel\s*\{[^}]*grid-template-rows:\s*minmax\(92px, max-content\) auto auto minmax\(0, 1fr\) auto/s,
  );
  assert.doesNotMatch(css, /height:\s*calc\(100%\s*-\s*174px\)/);
});

test("keeps radio messages at the top and scrolls only the active strip stack", async () => {
  const [simulator, css, layout] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);

  const sidebarIndex = simulator.indexOf('<aside className="side-panel">');
  const radioIndex = simulator.indexOf('className="panel-section radio-section"');
  const commandIndex = simulator.indexOf('className="command-deck"');
  const stripsIndex = simulator.indexOf(
    'className="panel-section strips-section"',
  );

  assert.ok(sidebarIndex >= 0);
  assert.ok(radioIndex > sidebarIndex);
  assert.ok(commandIndex > radioIndex);
  assert.ok(stripsIndex > commandIndex);
  assert.match(simulator, /world\.events\.slice\(-2\)\.reverse\(\)/);
  assert.match(css, /body\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(
    css,
    /\.side-panel\s*\{[^}]*height:\s*calc\(100vh - 70px\)[^}]*overflow:\s*hidden/s,
  );
  assert.match(css, /\.strips-section\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.strip-stack\s*\{[^}]*overflow-y:\s*auto/s);
  assert.match(css, /\.event-row p\s*\{[^}]*white-space:\s*normal/s);
  assert.match(css, /\.event-row p\s*\{[^}]*overflow-wrap:\s*anywhere/s);
  assert.match(css, /\.event-row p\s*\{[^}]*text-overflow:\s*clip/s);
  const eventText = css.match(/\.event-row p\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.doesNotMatch(eventText, /text-overflow:\s*ellipsis|white-space:\s*nowrap/);
  assert.match(layout, /B612/);
  assert.match(layout, /--font-b612/);
  assert.match(css, /body \.radio-section \*/);
  assert.match(css, /body \.strips-section \*/);
  assert.match(css, /font-family: var\(--font-b612\)/);
});

test("uses a bare command input without selection or suggested clearances", async () => {
  const [simulator, css] = await Promise.all([
    readFile(new URL("../app/simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(simulator, /aria-label="ATC command"/);
  assert.match(simulator, /<button type="submit">Send<\/button>/);
  assert.doesNotMatch(simulator, /className="selection-summary"/);
  assert.doesNotMatch(simulator, /className="quick-commands"/);
  assert.doesNotMatch(simulator, /const QUICK_COMMANDS/);
  assert.doesNotMatch(simulator, /press Enter/);
  assert.doesNotMatch(css, /\.selection-summary/);
  assert.doesNotMatch(css, /\.quick-commands/);
});

test("offers KSMO ground control as a researched separate game mode", async () => {
  const [carousel, route, ground, data, css, research] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/airports/ksmo/ground/page.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../app/ground-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ksmo-ground.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/ksmo-ground-research.md", import.meta.url), "utf8"),
    access(new URL("../public/ksmo-satellite.jpg", import.meta.url)),
  ]);

  assert.doesNotMatch(carousel, /SELECT POSITION/);
  assert.doesNotMatch(carousel, /Work the airspace from the tower scope/);
  assert.doesNotMatch(carousel, /Ground Control is available at KSMO/);
  assert.doesNotMatch(carousel, /Account protected/);
  assert.match(carousel, /Air Traffic Control/);
  assert.match(carousel, /Ground Control/);
  assert.match(carousel, /selectedMode/);
  assert.match(carousel, /"\/airports\/ksmo\/ground"/);
  assert.match(route, /await requireSession\(\)/);
  assert.match(route, /<GroundSimulator \/>/);
  assert.match(ground, /NEXT TOWER ARRIVAL/);
  assert.match(ground, /Tower lands arrivals automatically/);
  assert.match(ground, /removes it from the map/i);
  assert.match(ground, /off scope/);
  assert.match(data, /designation: "03\/21"/);
  assert.match(data, /lengthFeet: 3500/);
  assert.match(data, /widthFeet: 150/);
  assert.match(data, /runUpAreas: \["A2", "A5", "B2", "B5"\]/);
  assert.match(data, /airlineGates: 0/);
  assert.match(data, /jsxApronPositions: 2/);
  assert.match(data, /AT46:/);
  assert.match(data, /allowedParking: \["JSX"\]/);
  assert.match(data, /function projectKsmoGroundPoint/);
  assert.match(data, /return \{ x: point\.x, y: point\.y \}/);
  assert.match(data, /threshold03: projectKsmoGroundPoint/);
  assert.match(ground, /Interactive simulated airport surface display/);
  assert.match(ground, /SIMULATED AIRPORT SURFACE DISPLAY/);
  assert.match(ground, /ground-chart-layer/);
  assert.match(ground, /ground-taxiway-pavement/);
  assert.match(ground, /ground-building-shape/);
  assert.match(ground, /occupiedCurrentStand/);
  assert.doesNotMatch(css, /ksmo-ground-north-up\.jpg/);
  assert.match(css, /\.ground-chart-layer/);
  assert.match(css, /\.ground-airport-boundary/);
  assert.match(css, /\.ground-frame\s*\{[^}]*container-type:\s*size/s);
  assert.match(css, /\.ground-map\s*\{[^}]*aspect-ratio:\s*10 \/ 7/s);
  assert.match(css, /\.ground-surface-layer/);
  assert.match(ground, /KSMO_GROUND_CHART/);
  assert.match(ground, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(ground, /KSMO_RUNWAY_CONNECTORS/);
  assert.match(ground, /ground-intersection-pavement/);
  assert.match(css, /\.ground-taxiway-pavement\s*\{[^}]*stroke-width:\s*2\.2px/s);
  assert.match(research, /FAA Airport Diagram 26134/);
});

test("models complete ground commands, timing, and runway protection", async () => {
  const [ground, data] = await Promise.all([
    readFile(new URL("../app/ground-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/ksmo-ground.ts", import.meta.url), "utf8"),
  ]);

  for (const command of [
    "N172SM START",
    "N172SM TAXI RWY 21 VIA A",
    "N172SM RUNUP",
    "N172SM HOLD",
    "N172SM CONTINUE",
    "N172SM LINEUP RWY 21",
    "N172SM TAKEOFF RWY 21",
    "N520SM TAXI FBO1 VIA B",
    "N520SM TAXI TR3",
    "JSX501 TAXI JSX2",
  ]) {
    assert.match(ground, new RegExp(command.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(ground, /ARRIVAL_RUNWAY_BUFFER_SECONDS = 30/);
  assert.match(ground, /runwayOccupied\(world\)/);
  assert.match(ground, /sent around by Tower because Runway 21 was occupied/);
  assert.match(ground, /PARKING_POINTS = 100/);
  assert.match(ground, /DEPARTURE_POINTS = 125/);
  assert.match(ground, /simulationSpeed/);
  assert.match(data, /taxiKnots: 12/);
  assert.match(data, /taxiKnots: 15/);
  assert.match(data, /rampKnots: 5/);
  assert.match(data, /engineStartSeconds: 60/);
  assert.match(data, /function shortestGroundRoute/);
  assert.match(data, /\["W03N", "W03W"\]/);
  assert.match(data, /\["E21N", "E21E"\]/);
  assert.match(data, /FBOE:/);
  assert.match(data, /TRE:/);
  assert.match(data, /SH1:/);
  assert.match(ground, /ground-runway-exit/);
  assert.match(ground, /ground-parking-label/);
  assert.match(ground, /ground-parking-selector/);
  assert.match(ground, /plannedExit/);
  assert.match(ground, /plannedStandId/);
  assert.match(ground, /PARK/);
  assert.match(ground, /LAND \/ EXIT/);
  assert.match(ground, /function nextRoutingNode/);
  assert.match(ground, /function applyRunwayQueues/);
  assert.match(ground, /RUNWAY_QUEUE_SPACING_PERCENT/);
  assert.match(ground, /number \$\{aircraftAhead\.length \+ 1\} in sequence/);
  assert.doesNotMatch(ground, /ground-selected-route/);
  assert.doesNotMatch(ground, /ground-closed-marking/);
});

test("offers a researched KLAX ground map with paired-runway operations", async () => {
  const [carousel, route, ground, data, css, research] = await Promise.all([
    readFile(new URL("../app/airport-carousel.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/airports/klax/ground/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/lax-ground-simulator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../lib/klax-ground.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../docs/klax-ground-research.md", import.meta.url), "utf8"),
  ]);

  assert.match(carousel, /"\/airports\/klax\/ground"/);
  assert.match(route, /await requireSession\(\)/);
  assert.match(route, /<LaxGroundSimulator \/>/);
  assert.match(ground, /NEXT TOWER ARRIVAL/);
  assert.match(ground, /24R \/ 25L/);
  assert.match(ground, /24L \/ 25R/);
  assert.match(ground, /Terminal 5 is not assignable/);
  assert.match(ground, /ARRIVAL_RUNWAY_BUFFER_SECONDS = 35/);
  assert.match(ground, /ARRIVAL_GATE_SERVICE_SECONDS = 45/);
  assert.match(ground, /runwayPairOccupied/);
  assert.match(ground, /off scope/);
  assert.match(data, /lengthFeet: 8926/);
  assert.match(data, /lengthFeet: 10885/);
  assert.match(data, /lengthFeet: 12923/);
  assert.match(data, /lengthFeet: 11095/);
  assert.match(data, /northGroundFrequency: "121.650"/);
  assert.match(data, /southGroundFrequency: "121.750"/);
  assert.match(data, /G202:/);
  assert.match(data, /G86:/);
  assert.match(ground, /Interactive simulated airport surface display/);
  assert.match(ground, /SIMULATED AIRPORT SURFACE DISPLAY/);
  assert.match(ground, /LAX_TERMINAL_BUILDINGS/);
  assert.doesNotMatch(css, /klax-ground-headon\.jpg/);
  assert.match(css, /\.lax-ground-map/);
  assert.match(ground, /KLAX_GROUND_CHART/);
  assert.match(ground, /preserveAspectRatio="xMidYMid meet"/);
  assert.match(ground, /ground-intersection-pavement/);
  assert.doesNotMatch(ground, /ground-selected-route/);
  assert.match(research, /FAA Airport Diagram 26190/);
  assert.match(research, /Terminal 5 is currently closed/);
});
