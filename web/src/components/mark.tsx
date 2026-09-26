// The Casdey mark: two overlapping Cs, day 1 (faded) and day 90 (solid), one
// small step up and to the right. Spec in memory.md, "Brand".
type MarkProps = {
  className?: string;
  color?: string;
  /** Plays the step-up on load (the day 90 C moves into place). */
  animate?: boolean;
  title?: string;
};

export function Mark({ className, color = "currentColor", animate = false, title }: MarkProps) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={[className, animate ? "animate" : ""].filter(Boolean).join(" ")}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
    >
      {title ? <title>{title}</title> : null}
      <g fill="none" stroke={color} strokeWidth={7} strokeLinecap="round" strokeDasharray="76 100">
        <g className="mark-before" opacity={0.45}>
          <circle cx={22.5} cy={25.5} r={15} transform="rotate(48 22.5 25.5)" />
        </g>
        <g className="mark-after">
          <circle cx={25.5} cy={22.5} r={15} transform="rotate(48 25.5 22.5)" />
        </g>
      </g>
    </svg>
  );
}
