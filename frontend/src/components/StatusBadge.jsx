import Badge from "./Badge.jsx";

export default function StatusBadge({ active, yesLabel = "Yes", noLabel = "No", variant = "neutral" }) {
  return (
    <Badge variant={active ? variant : "neutral"}>
      {active ? yesLabel : noLabel}
    </Badge>
  );
}
