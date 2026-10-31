import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

export const cls = {
  page: "mx-auto flex min-h-dvh w-full max-w-md flex-col bg-bg text-ink",
  pad: "px-4",
  largeTitle: "text-display font-bold",
  title: "text-title font-bold",
  headline: "text-headline font-semibold",
  sub: "text-callout text-ink-2",
  sectionHeader: "px-4 pb-1.5 text-footnote font-semibold uppercase tracking-wide text-ink-2",
  sectionFooter: "px-4 pt-1.5 text-footnote text-ink-2",
  group: "overflow-hidden rounded-group bg-surface",
  row: "flex min-h-14 items-center gap-3 px-4 py-2.5",
  rowDivider: "border-t border-line first:border-t-0",
  label: "text-subhead font-semibold text-ink",
  input:
    "min-h-12 w-full rounded-control border border-line bg-surface px-3.5 text-body text-ink outline-none placeholder:text-ink-3 focus:border-accent focus:ring-2 focus:ring-accent/20",
  money: "font-semibold tabular-nums",
  btnBase:
    "inline-flex min-h-12 select-none items-center justify-center gap-2 rounded-control px-5 text-headline font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45",
  btn: {
    primary: "bg-accent text-white hover:bg-accent-pressed active:bg-accent-pressed",
    success: "bg-success text-white hover:bg-success-pressed active:bg-success-pressed",
    tonal: "bg-fill text-ink hover:bg-fill-pressed active:bg-fill-pressed",
    plain: "min-h-11 px-3 text-accent hover:bg-accent-soft active:bg-accent-soft",
  },
  btnLarge: "min-h-[52px] w-full",
} as const;

type Variant = keyof typeof cls.btn;

export function Button({ variant = "primary", className = "", ...props }: ComponentProps<"button"> & { variant?: Variant }) {
  return <button {...props} className={`${cls.btnBase} ${cls.btn[variant]} ${className}`} />;
}

export function LinkButton({ variant = "primary", className = "", ...props }: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link {...props} className={`${cls.btnBase} ${cls.btn[variant]} ${className}`} />;
}

export function BrandMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect width="28" height="28" rx="7" fill="#B84E0B" />
      <path d="M7 12.5 14 8l7 4.5" stroke="#fff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="9" y="13" width="10" height="8" rx="1.5" fill="none" stroke="#fff" strokeWidth="2" />
    </svg>
  );
}

export function Brand({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`inline-flex min-h-11 items-center gap-2 ${className}`}>
      <BrandMark />
      <span className="text-headline font-semibold">Pamsika</span>
    </Link>
  );
}

type IconName =
  | "camera"
  | "photo"
  | "chart"
  | "tag"
  | "check"
  | "back"
  | "close"
  | "warn"
  | "plus"
  | "trash"
  | "chevron-right"
  | "chevron-down"
  | "arrow-up"
  | "arrow-down"
  | "minus"
  | "share"
  | "print"
  | "qr";

export function Icon({ name, size = 22, className = "" }: { name: IconName; size?: number; className?: string }) {
  const paths: Record<IconName, ReactNode> = {
    camera: (
      <>
        <path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <circle cx="12" cy="13" r="3.5" />
      </>
    ),
    photo: (
      <>
        <rect x="3" y="4" width="18" height="16" rx="2" />
        <circle cx="9" cy="10" r="1.6" />
        <path d="m21 16-5-5-9 9" />
      </>
    ),
    chart: <path d="M4 19V10M10 19V5M16 19v-6M3 19h18" />,
    tag: (
      <>
        <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" />
        <circle cx="7.5" cy="7.5" r="1.3" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    back: <path d="M15 18l-6-6 6-6" />,
    close: <path d="M6 6l12 12M18 6 6 18" />,
    warn: (
      <>
        <path d="M12 9v4M12 17h.01" />
        <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    trash: <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" />,
    "chevron-right": <path d="m9 6 6 6-6 6" />,
    "chevron-down": <path d="m6 9 6 6 6-6" />,
    "arrow-up": <path d="M12 19V5M6 11l6-6 6 6" />,
    "arrow-down": <path d="M12 5v14M6 13l6 6 6-6" />,
    minus: <path d="M5 12h14" />,
    share: (
      <>
        <path d="M12 3v12M7 8l5-5 5 5" />
        <path d="M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" />
      </>
    ),
    print: (
      <>
        <path d="M7 9V3h10v6" />
        <rect x="3" y="9" width="18" height="8" rx="2" />
        <path d="M7 14h10v7H7z" />
      </>
    ),
    qr: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <path d="M14 14h3v3h-3zM18 18h3v3h-3z" />
      </>
    ),
  };
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}

/** Compact top bar: optional back link, centred title, optional trailing action. */
export function NavBar({ back, backLabel = "Back", title, trailing }: { back?: string; backLabel?: string; title?: string; trailing?: ReactNode }) {
  return (
    <header className="no-print grid min-h-12 grid-cols-[1fr_auto_1fr] items-center px-2 pt-2">
      <div className="flex">
        {back && (
          <Link href={back} className={`${cls.btnBase} ${cls.btn.plain} gap-0.5 pl-1`}>
            <Icon name="back" size={22} />
            {backLabel}
          </Link>
        )}
      </div>
      <span className="text-headline font-semibold">{title}</span>
      <div className="flex justify-end">{trailing}</div>
    </header>
  );
}

export function LargeTitle({ title, subtitle, eyebrow }: { title: ReactNode; subtitle?: ReactNode; eyebrow?: ReactNode }) {
  return (
    <div className={`${cls.pad} flex flex-col gap-1 pt-2 pb-4`}>
      {eyebrow && <span className="text-footnote font-semibold text-ink-2">{eyebrow}</span>}
      <h1 className={`${cls.largeTitle} text-balance`}>{title}</h1>
      {subtitle && <p className={cls.sub}>{subtitle}</p>}
    </div>
  );
}

/** Grouped inset list section (iOS inset-grouped / M3 list in a container). */
export function Section({ header, footer, children, className = "" }: { header?: ReactNode; footer?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`${cls.pad} ${className}`}>
      {header && <h2 className={cls.sectionHeader}>{header}</h2>}
      <div className={cls.group}>{children}</div>
      {footer && <p className={cls.sectionFooter}>{footer}</p>}
    </section>
  );
}

type RowProps = { title: ReactNode; subtitle?: ReactNode; leading?: ReactNode; trailing?: ReactNode; chevron?: boolean; className?: string };

function RowInner({ title, subtitle, leading, trailing, chevron }: RowProps) {
  return (
    <>
      {leading}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="text-body">{title}</span>
        {subtitle && <span className="text-subhead text-ink-2">{subtitle}</span>}
      </span>
      {trailing}
      {chevron && <Icon name="chevron-right" size={18} className="shrink-0 text-ink-3" />}
    </>
  );
}

export function Row(props: RowProps) {
  return (
    <div className={`${cls.row} ${cls.rowDivider} ${props.className ?? ""}`}>
      <RowInner {...props} />
    </div>
  );
}

export function RowLink({ href, ...props }: RowProps & { href: string }) {
  return (
    <Link href={href} className={`${cls.row} ${cls.rowDivider} text-left hover:bg-bg active:bg-fill ${props.className ?? ""}`}>
      <RowInner chevron {...props} />
    </Link>
  );
}

export function SegmentedControl<T extends string>({
  name,
  value,
  options,
  onChange,
  legend,
}: {
  name: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  legend: string;
}) {
  return (
    <fieldset>
      <legend className={`${cls.label} mb-2`}>{legend}</legend>
      <div className={`grid rounded-control bg-fill p-0.5 ${options.length === 2 ? "grid-cols-2" : options.length === 4 ? "grid-cols-4" : "grid-cols-3"}`}>
        {options.map((o) => (
          <label
            key={o.value}
            className={`flex min-h-11 cursor-pointer items-center justify-center rounded-[10px] text-subhead font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
              value === o.value ? "bg-surface text-ink shadow-[0_1px_2px_rgba(0,0,0,0.12)]" : "text-ink-2"
            }`}
          >
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="sr-only" />
            {o.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function BottomNav({ active }: { active: "snap" | "sales" | "prices" }) {
  const item = (key: typeof active, href: string, label: string, icon: IconName) => (
    <Link
      href={href}
      aria-current={active === key ? "page" : undefined}
      className={`flex min-h-12 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active === key ? "text-accent" : "text-ink-2"}`}
    >
      <Icon name={icon} size={24} />
      {label}
    </Link>
  );
  return (
    <nav aria-label="Main" className="no-print sticky bottom-0 mt-auto grid grid-cols-3 border-t border-line bg-surface/95 px-2 pt-1 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur">
      {item("snap", "/snap", "Snap", "camera")}
      {item("sales", "/sales", "Sales", "chart")}
      {item("prices", "/prices", "Prices", "tag")}
    </nav>
  );
}

export function Badge({ children }: { children: ReactNode }) {
  return <span className="inline-flex items-center rounded-md bg-fill px-1.5 py-0.5 text-footnote font-medium text-ink-2">{children}</span>;
}

type Tone = "info" | "warn" | "error" | "success";
const toneCls: Record<Tone, string> = {
  info: "bg-fill text-ink",
  warn: "bg-warn-soft text-warn",
  error: "bg-danger-soft text-danger",
  success: "bg-success-soft text-success",
};
const toneIcon: Record<Tone, IconName> = { info: "warn", warn: "warn", error: "warn", success: "check" };

export function Notice({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={`flex items-start gap-2.5 rounded-group px-3.5 py-3 text-subhead ${toneCls[tone]}`}>
      <Icon name={toneIcon[tone]} size={18} className="mt-px shrink-0" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return <Notice tone="error">{children}</Notice>;
}

export function kwacha(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "K —";
  return `K${Math.round(n).toLocaleString("en-ZM")}`;
}
