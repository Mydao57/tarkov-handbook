import { useEffect, useState } from "react";
import { api, ApiError, type SessionUser } from "./api";
import { Dashboard } from "./pages/Dashboard";
import { Logs } from "./pages/Logs";
import { Preferences } from "./pages/Preferences";

type Tab = "dashboard" | "preferences" | "logs";

export function App(): React.JSX.Element {
  const [user, setUser] = useState<SessionUser | null>();
  const [failed, setFailed] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");

  useEffect(() => {
    api
      .me()
      .then(setUser)
      .catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 401) setUser(null);
        else setFailed(true);
      });
  }, []);

  if (failed) {
    return (
      <Centered>
        <h1>Panel unavailable</h1>
        <p className="muted">Could not reach the panel API. Check that the service is running.</p>
      </Centered>
    );
  }

  if (user === undefined) {
    return (
      <Centered>
        <p className="muted">Loading...</p>
      </Centered>
    );
  }

  if (user === null) {
    return (
      <Centered>
        <h1>TarkovHandbook Admin</h1>
        <p className="muted">Sign in with a Discord account on the bot's admin allow-list.</p>
        <a className="btn primary" href="/auth/login">
          Sign in with Discord
        </a>
      </Centered>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <strong>TarkovHandbook Admin</strong>
        <nav>
          <TabButton current={tab} value="dashboard" onSelect={setTab}>
            Dashboard
          </TabButton>
          <TabButton current={tab} value="preferences" onSelect={setTab}>
            Preferences
          </TabButton>
          <TabButton current={tab} value="logs" onSelect={setTab}>
            Logs
          </TabButton>
        </nav>
        <div className="spacer" />
        <span className="muted">{user.username}</span>
        <form method="post" action="/auth/logout">
          <button className="btn" type="submit">
            Sign out
          </button>
        </form>
      </header>
      <main className="content">
        {tab === "dashboard" && <Dashboard />}
        {tab === "preferences" && <Preferences />}
        {tab === "logs" && <Logs />}
      </main>
    </div>
  );
}

function TabButton(props: {
  current: Tab;
  value: Tab;
  onSelect: (t: Tab) => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      className={props.current === props.value ? "tab active" : "tab"}
      onClick={() => props.onSelect(props.value)}
      type="button"
    >
      {props.children}
    </button>
  );
}

function Centered(props: { children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="centered">
      <div className="card">{props.children}</div>
    </div>
  );
}
