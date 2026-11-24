// Rodzaje pozycji katalogu - te same co Part.KIND_CHOICES w apps/inventory/models.py.
export const KIND_OPTIONS = [
    { value: "service", label: "Usługa" },
    { value: "part", label: "Część" },
    { value: "accessory", label: "Akcesorium" },
];

export const KIND_TABS = [
    { value: "", label: "Wszystko" },
    { value: "service", label: "Usługi" },
    { value: "part", label: "Części" },
    { value: "accessory", label: "Akcesoria" },
];
