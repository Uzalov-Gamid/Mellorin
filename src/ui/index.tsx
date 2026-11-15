import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode } from "react";

type SurfaceProps = HTMLAttributes<HTMLDivElement>;
export function Pill({ children, className = "", ...props }: HTMLAttributes<HTMLSpanElement>) {
  return <span className={`ui-pill ${className}`} {...props}>{children}</span>;
}
export const Chip = Pill;
export function Card({ variant = "outlined", className = "", ...props }: SurfaceProps & { variant?: "paper" | "outlined" }) {
  return <div className={`ui-card ui-card-${variant} ${className}`} {...props} />;
}
export function NightCard({ className = "", ...props }: SurfaceProps) {
  return <div className={`ui-card ui-night ${className}`} {...props} />;
}
export function Button({ variant = "filled", className = "", type = "button", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "filled" | "outlined" }) {
  return <button type={type} className={`ui-button ui-button-${variant} ${className}`} {...props} />;
}
export function Ring({ value, total = 100, children, label, size = 44 }: { value: number; total?: number; children?: ReactNode; label: string; size?: number }) {
  const percent = Number.isFinite(value) && Number.isFinite(total) && total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
  return <span className="ui-ring" role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}
    style={{ "--progress": `${percent}%`, width: size, height: size } as CSSProperties}><span>{children}</span></span>;
}
export type ProgressState = "done" | "current" | "pending" | "error";
export function Dots({ states, label }: { states: ProgressState[]; label: string }) {
  return <span className="ui-dots" role="group" aria-label={label}>{states.map((state, index) => <span key={index} className={`ui-dot ui-${state}`} aria-label={`${index + 1}: ${state}`} />)}</span>;
}
export function Segments({ states, label }: { states: ProgressState[]; label: string }) {
  return <div className="ui-segments" role="group" aria-label={label}>{states.map((state, index) => <span key={index} className={`ui-segment ui-${state}`} aria-label={`${index + 1}: ${state}`} />)}</div>;
}
export function StepPills({ steps }: { steps: { label: string; state: Exclude<ProgressState, "error"> }[] }) {
  return <ol className="ui-steps">{steps.map((step, index) => <li key={index} className={`ui-pill ui-step-${step.state}`} aria-current={step.state === "current" ? "step" : undefined}>{step.state === "done" ? "✓" : step.state === "current" ? "●" : "○"} {step.label}</li>)}</ol>;
}
export function Table({ headers, rows, caption }: { headers: string[]; rows: ReactNode[][]; caption?: string }) {
  return <div className="ui-table-wrap"><table className="ui-table">{caption && <caption>{caption}</caption>}<thead><tr>{headers.map((header, index) => <th scope="col" key={index}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, column) => <td key={column}>{cell}</td>)}</tr>)}</tbody></table></div>;
}
export function Quote({ children }: { children: ReactNode }) { return <blockquote className="ui-quote">{children}</blockquote>; }
export function Collapsible({ children, title = "показать ответ" }: { children: ReactNode; title?: string }) {
  return <details className="ui-collapsible"><summary>{title}</summary><div>{children}</div></details>;
}
