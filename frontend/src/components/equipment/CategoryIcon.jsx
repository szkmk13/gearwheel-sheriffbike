import { Bike, Snowflake } from "lucide-react";
import { categoryLabel } from "../../utils/equipment";

const ICONS = { bike: Bike, winter: Snowflake };

// Mala ikona kategorii sprzetu w kolorze otaczajacego tekstu.
export default function CategoryIcon({ category, className = "w-4 h-4" }) {
  const Icon = ICONS[category];
  if (!Icon) return null;
  return (
    <Icon className={`shrink-0 ${className}`} aria-label={categoryLabel(category)} role="img" strokeWidth={1.9} />
  );
}

// Ikony wszystkich kategorii obecnych w zleceniu (zlecenie mieszane pokazuje obie).
export function CategoryIcons({ categories, className }) {
  if (!categories?.length) return null;
  return (
    <span className="inline-flex items-center gap-1 text-[var(--color-ink-3)]">
      {categories.map((c) => <CategoryIcon key={c} category={c} className={className} />)}
    </span>
  );
}
