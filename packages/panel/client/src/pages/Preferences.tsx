import { useState } from "react";
import { LOCALES, type Locale } from "@tarkov/shared";
import { api } from "../api";
import { usePolling } from "../hooks";

export function Preferences(): React.JSX.Element {
  const { data, error, refresh } = usePolling(() => api.preferences(), 0);
  const [busy, setBusy] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const [newId, setNewId] = useState("");
  const [newLocale, setNewLocale] = useState<Locale>("en");

  async function run(label: string, fn: () => Promise<unknown>): Promise<void> {
    setBusy(label);
    setNotice(undefined);
    try {
      await fn();
      refresh();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(undefined);
    }
  }

  if (error && !data) {
    return (
      <section className="panel">
        <p className="error">Could not load preferences: {error}</p>
      </section>
    );
  }

  const entries = data ?? [];

  return (
    <section className="panel wide">
      <h2>Language preferences ({entries.length})</h2>
      {notice && <div className="notice">{notice}</div>}

      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault();
          const id = newId.trim();
          if (!id) return;
          void run("add", () => api.setPreference(id, newLocale)).then(() => setNewId(""));
        }}
      >
        <input
          placeholder="Discord user ID"
          value={newId}
          onChange={(e) => setNewId(e.target.value)}
          inputMode="numeric"
        />
        <select value={newLocale} onChange={(e) => setNewLocale(e.target.value as Locale)}>
          {LOCALES.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <button className="btn" type="submit" disabled={!!busy}>
          Add / set
        </button>
      </form>

      {entries.length === 0 ? (
        <p className="muted">No stored overrides. Users follow their Discord client language.</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>User ID</th>
              <th>Locale</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.userId}>
                <td>
                  <code>{entry.userId}</code>
                </td>
                <td>
                  <select
                    value={entry.locale}
                    disabled={!!busy}
                    onChange={(e) =>
                      run("update", () =>
                        api.setPreference(entry.userId, e.target.value as Locale),
                      )
                    }
                  >
                    {LOCALES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </td>
                <td>
                  <button
                    className="btn sm"
                    disabled={!!busy}
                    onClick={() => run("delete", () => api.deletePreference(entry.userId))}
                  >
                    delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
