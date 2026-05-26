interface StatusPillProps {
  running: boolean;
}

export function StatusPill({ running }: StatusPillProps) {
  return (
    <span className={"status-pill " + (running ? "running" : "")}>
      <span className="dot" />
      {running ? "Running" : "Stopped"}
    </span>
  );
}
