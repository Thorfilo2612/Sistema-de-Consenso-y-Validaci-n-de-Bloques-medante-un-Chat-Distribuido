import "./Tag.css";

const VARIANTS = {
  private:   "tag--private",
  system:    "tag--system",
  broadcast: "tag--broadcast",
  accent:    "tag--accent",
};

export default function Tag({ children, variant = "broadcast" }) {
  const cls = VARIANTS[variant] ?? VARIANTS.broadcast;
  return (
    <span className={`tag ${cls}`} aria-hidden="true">
      {children}
    </span>
  );
}
