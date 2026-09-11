import { useState } from "react";
import type { DeployScope, GameMode } from "@tarkov/shared";
import { api } from "../api";
import { ago, bytes, duration, time } from "../format";
import { usePolling } from "../hooks";

export function Dashboard(): React.JSX.Element {
  const { data, error, loading, refresh } = usePolling(() => api.dashboard(), 5000);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<string>();

  async function run(label: string, fn: () => Promise<unknown>): Promise<void> {
    setBusy(label);
    setNotice(undefined);
    try {
      await fn();
      setNotice(`${label}: done`);
      refresh();
    } catch (err) {
      setNotice(`${label}: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(undefined);
    }
  }

  if (error && !data) {
    return (
      <section className="panel">
        <p className="error">Could not load dashboard: {error}</p>
      </section>
    );
  }
  if (!data) return <p className="muted">Loading...</p>;

  const { bot, tarkov, caches, flags, invocations } = data;

  return (
    <div className="grid">
      {notice && <div className="notice">{notice}</div>}

      <section className="panel">
        <h2>Bot</h2>
        <dl className="kv">
          <dt>Gateway</dt>
          <dd>
            <span className={bot.ready ? "dot ok" : "dot bad"} /> {bot.ready ? "ready" : "offline"}
            {bot.tag ? ` - ${bot.tag}` : ""}
          </dd>
          <dt>Guilds</dt>
          <dd>{bot.guildCount}</dd>
          <dt>Uptime</dt>
          <dd>{duration(bot.readyUptimeMs ?? bot.processUptimeMs)}</dd>
          <dt>WS ping</dt>
          <dd>{bot.wsPingMs == null ? "-" : `${bot.wsPingMs} ms`}</dd>
        </dl>
      </section>

      <section className="panel">
        <h2>
          tarkov.dev API
          <button className="btn sm" onClick={() => run("Re-check API", () => api.tarkovHealth(true))}>
            re-check
          </button>
        </h2>
        <dl className="kv">
          <dt>Status</dt>
          <dd>
            <span className={tarkov.reachable ? "dot ok" : "dot bad"} />{" "}
            {tarkov.reachable ? "reachable" : "unreachable"}
          </dd>
          <dt>Last OK fetch</dt>
          <dd>{ago(tarkov.lastOkAt)}</dd>
          <dt>Checked</dt>
          <dd>{ago(tarkov.checkedAt)}</dd>
          {tarkov.error && (
            <>
              <dt>Error</dt>
              <dd className="muted clip">{tarkov.error}</dd>
            </>
          )}
        </dl>
      </section>

      <section className="panel">
        <h2>
          Runtime flags
          {!flags.atDefaults && <span className="badge warn">not at defaults</span>}
        </h2>
        <div className="flags">
          <Toggle
            label="Fixtures mode"
            hint="serve bundled snapshots instead of tarkov.dev"
            checked={flags.current.fixturesMode}
            disabled={!!busy}
            onChange={(v) => run("Set fixturesMode", () => api.setFlags({ fixturesMode: v }))}
          />
          <Toggle
            label="Freeze cache"
            hint="never refresh caches; serve whatever is loaded"
            checked={flags.current.freezeCache}
            disabled={!!busy}
            onChange={(v) => run("Set freezeCache", () => api.setFlags({ freezeCache: v }))}
          />
          <label className="field">
            <span>Game mode</span>
            <select
              value={flags.current.gameMode}
              disabled={!!busy}
              onChange={(e) =>
                run("Set gameMode", () =>
                  api.setFlags({ gameMode: e.target.value as GameMode }),
                )
              }
            >
              <option value="regular">regular</option>
              <option value="pve">pve</option>
            </select>
          </label>
        </div>
        <p className="muted sm">
          Defaults: fixtures {String(flags.defaults.fixturesMode)}, freeze{" "}
          {String(flags.defaults.freezeCache)}, {flags.defaults.gameMode}
        </p>
      </section>

      <section className="panel">
        <h2>Slash commands</h2>
        <p className="muted sm">Re-register the slash command definitions with Discord.</p>
        <div className="row">
          <button
            className="btn"
            disabled={!!busy}
            onClick={() => run("Deploy (guild)", () => deploy("guild"))}
          >
            Deploy to test guild
          </button>
          <button
            className="btn"
            disabled={!!busy}
            onClick={() => run("Deploy (global)", () => deploy("global"))}
          >
            Deploy globally
          </button>
        </div>
        <p className="muted sm">Global propagation can take up to ~1h.</p>
      </section>

      <section className="panel wide">
        <h2>
          Caches
          <button
            className="btn sm"
            disabled={!!busy}
            onClick={() => run("Clear all caches", () => api.clearCaches())}
          >
            clear all
          </button>
        </h2>
        {caches.length === 0 ? (
          <p className="muted">No caches registered yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Key</th>
                <th>State</th>
                <th>Age</th>
                <th>Entries</th>
                <th>Size</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {caches.map((c) => (
                <tr key={c.key}>
                  <td>
                    <code>{c.key}</code>
                  </td>
                  <td>
                    {c.present ? (c.expired ? "stale" : "fresh") : "empty"}
                  </td>
                  <td>{c.present ? duration(c.ageMs) : "-"}</td>
                  <td>{c.entryCount ?? "-"}</td>
                  <td>{bytes(c.approxSizeBytes)}</td>
                  <td>
                    <button
                      className="btn sm"
                      disabled={!!busy || !c.present}
                      onClick={() => run(`Clear ${c.key}`, () => api.clearCaches(c.key))}
                    >
                      clear
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="panel wide">
        <h2>Recent commands {loading && <span className="muted sm">refreshing...</span>}</h2>
        {invocations.length === 0 ? (
          <p className="muted">Nothing recorded since the last restart.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Time</th>
                <th>Command</th>
                <th>User</th>
                <th>Guild</th>
                <th>Result</th>
                <th>Took</th>
              </tr>
            </thead>
            <tbody>
              {invocations.map((inv, i) => (
                <tr key={`${inv.at}-${i}`}>
                  <td>{time(inv.at)}</td>
                  <td>
                    /{inv.command}
                    {inv.sub ? ` ${inv.sub}` : ""}
                  </td>
                  <td className="clip">{inv.userId}</td>
                  <td className="clip">{inv.guildId ?? "DM"}</td>
                  <td>
                    {inv.ok ? (
                      <span className="ok">ok</span>
                    ) : (
                      <span className="error clip" title={inv.error ?? ""}>
                        error
                      </span>
                    )}
                  </td>
                  <td>{duration(inv.durationMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );

  async function deploy(scope: DeployScope): Promise<void> {
    const result = await api.deploy(scope);
    setNotice(`Deployed ${result.registered} ${result.scope} command(s): ${result.commands.join(", ")}`);
  }
}

function Toggle(props: {
  label: string;
  hint: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="field toggle">
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange(e.target.checked)}
      />
      <span>
        {props.label}
        <span className="muted sm block">{props.hint}</span>
      </span>
    </label>
  );
}
