export function HeroCard({ accent = false, className = "", ...props }) {
  return (
    <section
      className={[
        "app-hero-card",
        accent ? "app-hero-card-accent" : "",
        className
      ].filter(Boolean).join(" ")}
      {...props}
    />
  );
}

export function Card({ wide = false, className = "", ...props }) {
  return (
    <article
      className={[
        "app-card",
        wide ? "app-card-wide" : "",
        className
      ].filter(Boolean).join(" ")}
      {...props}
    />
  );
}
