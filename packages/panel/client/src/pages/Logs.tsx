import { useEffect, useRef, useState } from "react";
import type { LogLine } from "@tarkov/shared";
import { time } from "../format";

const MAX_LINES = 500;

export function Logs(): React.JSX.Element {
  const [lines, setLines] = useState<LogLine[]>([]);
  const [connected, setConnected] = useState(false);
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const source = new EventSource("/api/logs/stream");
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);
    source.onmessage = (event) => {
      if (pausedRef.current) return;
      try {
        const line = JSON.parse(event.data) as LogLine;
        setLines((prev) => {
          const next = [...prev, line];
          return next.length > MAX_LINES ? next.slice(next.length - MAX_LINES) : next;
        });
      } catch {
        /* ignore keep-alive comments and malformed frames */
      }
    };
    return () => source.close();
  }, []);

  useEffect(() => {
    if (!paused) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lines, paused]);

  return (
    <section className="panel wide">
      <h2>
        Live logs
        <span className={connected ? "badge ok" : "badge warn"}>
          {connected ? "connected" : "reconnecting"}
        </span>
        <button className="btn sm" onClick={() => setPaused((p) => !p)}>
          {paused ? "resume" : "pause"}
        </button>
        <button className="btn sm" onClick={() => setLines([])}>
          clear
        </button>
      </h2>
      <div className="logview">
        {lines.length === 0 && <div className="muted">Waiting for log lines...</div>}
        {lines.map((line, i) => (
          <div key={i} className={`logline ${line.level}`}>
            <span className="muted">{time(line.at)}</span>{" "}
            <span className="loglevel">{line.level.toUpperCase()}</span> {line.message}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}
