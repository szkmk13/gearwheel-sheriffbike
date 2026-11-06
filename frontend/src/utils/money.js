// Kwoty z DRF przychodzą jako stringi ("550.00").
export const formatMoney = (value) => {
  const number = Number(value ?? 0);
  return `${number.toLocaleString('pl-PL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} zł`;
};
