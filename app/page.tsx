import { AirportCarousel } from "./airport-carousel";
import {
  chatGPTSignInPath,
  chatGPTSignOutPath,
  getChatGPTUser,
} from "./chatgpt-auth";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await getChatGPTUser();

  if (!user) {
    return (
      <main className="login-home">
        <div className="login-home-background" aria-hidden="true" />
        <header className="login-home-header">
          <div className="login-brand">
            <span aria-hidden="true">PR</span>
            <strong>PACIFIC RADAR</strong>
          </div>
          <a href={chatGPTSignInPath("/")}>Log in</a>
        </header>

        <section className="login-home-content">
          <div className="login-title">
            <div className="login-radar-mark" aria-hidden="true">
              <span />
              <i />
            </div>
            <h1>PACIFIC RADAR</h1>
            <p>Air Traffic Control Simulator</p>
          </div>

          <div className="login-card">
            <p>WELCOME, CONTROLLER</p>
            <h2>Sign in to play</h2>
            <a className="login-button" href={chatGPTSignInPath("/")}>
              Continue with ChatGPT
              <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <AirportCarousel
      displayName={user.displayName}
      signOutHref={chatGPTSignOutPath("/")}
    />
  );
}
