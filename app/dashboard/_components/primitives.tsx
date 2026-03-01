"use client";

import { ReactNode, useEffect, useMemo, useRef, useState } from "react";

export function Card({
  title,
  subtitle,
  right,
  children,
}: {
  title?: string;
  subtitle?: string;
  right?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="ui-card">
      {title || subtitle || right ? (
        <header className="ui-card-head">
          <div>
            {title ? <h3>{title}</h3> : null}
            {subtitle ? <p className="ui-card-subtitle">{subtitle}</p> : null}
          </div>
          {right ? <div>{right}</div> : null}
        </header>
      ) : null}
      {children}
    </section>
  );
}

export function Tabs({
  tabs,
  value,
  onChange,
}: {
  tabs: Array<{ label: string; value: string }>;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="ui-tabs" role="tablist" aria-label="Pilihan tampilan data">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          className={value === tab.value ? "is-active" : ""}
          onClick={() => onChange(tab.value)}
          role="tab"
          aria-selected={value === tab.value}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function Popover({
  triggerLabel,
  children,
}: {
  triggerLabel: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    if (open) {
      document.addEventListener("mousedown", onClickOutside);
      return () => document.removeEventListener("mousedown", onClickOutside);
    }
  }, [open]);

  return (
    <div className="popover" ref={rootRef}>
      <button type="button" className="btn-secondary" onClick={() => setOpen((prev) => !prev)}>
        {triggerLabel}
      </button>
      {open ? <div className="popover-panel">{children}</div> : null}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn-ghost" onClick={onClose} aria-label="Tutup">
            x
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {footer ? <footer className="modal-foot">{footer}</footer> : null}
      </section>
    </div>
  );
}

export function StatBlock({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="stat-block">
      <p>{label}</p>
      <strong>{value}</strong>
      {hint ? <span>{hint}</span> : null}
    </div>
  );
}

export function DateRangeSelect({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  const options = useMemo(
    () => [
      { label: "30 Hari", value: 30 },
      { label: "90 Hari", value: 90 },
      { label: "180 Hari", value: 180 },
    ],
    [],
  );

  return (
    <select value={String(value)} onChange={(event) => onChange(Number(event.target.value))}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export function EmptyState({
  title,
  description,
  cta,
  onAction,
}: {
  title: string;
  description: string;
  cta: string;
  onAction: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-illustration" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <h3>{title}</h3>
      <p>{description}</p>
      <button type="button" onClick={onAction}>
        {cta}
      </button>
    </div>
  );
}
