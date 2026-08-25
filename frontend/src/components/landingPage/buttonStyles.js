// Base carries no border-color on purpose - each variant sets its own.
// (Two border-color utilities in one class string resolve by stylesheet order,
// not by the order they are written here, so the variant would lose.)
export const BTN = "inline-flex items-center justify-center gap-2.5 h-[52px] px-6 rounded-full font-bold text-[15.5px] border-[1.5px] cursor-pointer whitespace-nowrap transition-transform duration-200";
export const BTN_PRIMARY = BTN + " bg-accent text-white border-accent hover:bg-accent-deep hover:border-accent-deep hover:-translate-y-0.5";
export const BTN_GHOST = BTN + " bg-transparent text-ink border-line-2 hover:border-ink hover:-translate-y-0.5";
export const BTN_DARK = BTN + " bg-ink text-white border-ink hover:bg-black hover:border-black hover:-translate-y-0.5";
export const BTN_LG = "h-[58px] px-8 text-[16.5px]";
