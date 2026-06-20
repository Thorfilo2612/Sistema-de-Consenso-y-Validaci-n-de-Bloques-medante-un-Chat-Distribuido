import "./Button.css";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  type = "button",
  onClick,
  className = "",
  "aria-label": ariaLabel,
}) {
  return (
    <button
      type={type}
      className={`btn btn--${variant} btn--${size}${loading ? " btn--loading" : ""} ${className}`.trim()}
      disabled={disabled || loading}
      onClick={onClick}
      aria-label={ariaLabel}
      aria-busy={loading || undefined}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}
