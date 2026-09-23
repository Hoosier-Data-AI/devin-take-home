import { titleCase } from "../format";

export function Badge({
  kind,
  value
}: {
  kind: "risk" | "status" | "environment";
  value: string;
}) {
  return (
    <span className={`badge ${kind}-${value}`}>{titleCase(value)}</span>
  );
}
