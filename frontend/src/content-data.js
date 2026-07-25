export const DEFAULT_CONTENT = {
  brand: {
    name: "Sheriff Bike",
    tagline: "Serwis · Gdańsk",
    phone: "729 787 883",
    phoneHref: "+48729787883",
  },

  hero: {
    variant: "centered",
    eyebrow: "Serwis rowerowy · Gdańsk",
    title: "Złap formę.\nResztą zajmie się\nszeryf.",
    sub: "Serwis rowerów szosowych i gravelowych - oraz nart i snowboardu zimą. Diagnoza, regulacja, naprawa. Wszystko w jednym warsztacie.",
    ctaPrimary: "Umów wizytę",
    ctaSecondary: "Zobacz usługi",
  },

  trust: [
    { k: "5,0 / 5", v: "ocena w Google" },
    { k: "81+", v: "zadowolonych klientów" },
    { k: "12 lat", v: "doświadczenia" },
    { k: "48h", v: "typowy czas realizacji" },
  ],

  services: {
    eyebrow: "Co robimy",
    title: "Serwis rowerowy\nod A do Z",
    lead: "Od szybkiej regulacji po pełny rozbiór roweru - dobierzemy zakres prac do Twoich potrzeb i budżetu. Każdą usługę kończymy jazdą próbną i wyceną na miejscu.",
    items: [
      { icon: "spray", tag: "Czystość", title: "Czyszczenie roweru",
        desc: "Mycie ramy, odtłuszczenie i konserwacja napędu. Rower wraca do Ciebie jak nowy i gotowy na sezon.",
        points: ["Mycie ramy i kół", "Odtłuszczenie napędu", "Konserwacja i smarowanie łańcucha"], featured: false },
      { icon: "wrench", tag: "Najczęściej wybierany", title: "Serwis podstawowy",
        desc: "Kompleksowy przegląd najważniejszych podzespołów z regulacją i smarowaniem. Idealny przed sezonem.",
        points: ["Regulacja przerzutek i hamulców", "Kontrola luzów i połączeń", "Smarowanie napędu"], featured: false },
      { icon: "cog", tag: "Pełen zakres", title: "Serwis rozszerzony",
        desc: "Pełny rozbiór roweru, dokładne czyszczenie i wymiana elementów eksploatacyjnych. Dla wymagających i przed dłuższym wyjazdem.",
        points: ["Rozbiór i czyszczenie podzespołów", "Przegląd sterów, suportu i piast", "Wymiana części eksploatacyjnych"], featured: true },
      { icon: "bike", tag: "Montaż", title: "Składanie roweru",
        desc: "Profesjonalny montaż roweru z kartonu lub po transporcie, z pełnym ustawieniem i jazdą próbną.",
        points: ["Montaż z kartonu", "Ustawienie pozycji", "Jazda próbna i korekty"], featured: false },
      { icon: "gauge", tag: "Szybko", title: "Regulacje przerzutek i hamulców",
        desc: `Szybka regulacja napędu i hamowania oraz centrowanie kół. Często gotowe „od ręki".`,
        points: ["Precyzyjna regulacja przerzutek", "Ustawienie hamulców", "Centrowanie kół"], featured: false },
    ],
    ctaTitle: "Nie wiesz, czego potrzebujesz?",
    ctaDesc: "Przyjedź lub napisz - ocenimy stan roweru i zaproponujemy najlepszy zakres serwisu. Wycena zawsze bezpłatna.",
  },

  winter: {
    eyebrow: "Sezon zimowy",
    title: "Narty i snowboard\nw tych samych\ndobrych rękach",
    lead: "Gdy rowery idą do garażu, my przesiadamy się na deski. Profesjonalny serwis nart i snowboardu - żeby każdy zjazd był szybki, równy i bezpieczny.",
    cta: "Oddaj sprzęt do serwisu",
    items: [
      { icon: "edge",  title: "Ostrzenie krawędzi", desc: "Naostrzone, równe krawędzie dla pełnej kontroli na lodzie i twardym śniegu." },
      { icon: "spray", title: "Smarowanie na gorąco", desc: "Wtopiony wosk dopasowany do warunków - większy poślizg i ochrona ślizgu." },
      { icon: "ski",   title: "Regeneracja ślizgu", desc: "Naprawa rys i ubytków, cyklinowanie i wykończenie struktury ślizgu." },
      { icon: "cog",   title: "Ustawienie wiązań", desc: "Kontrola i regulacja wiązań pod Twoją wagę, poziom i buty." },
    ],
  },

  gallery: {
    eyebrow: "Z warsztatu",
    title: "Zajrzyj do nas",
    note: "Wgraj własne zdjęcia - przeciągnij je na kafelki poniżej.",
    tiles: [
      { id: "g1", ph: "Warsztat", span: "tall" },
      { id: "g2", ph: "Rower po serwisie", span: "" },
      { id: "g3", ph: "Napęd / detal", span: "" },
      { id: "g4", ph: "Koła i opony", span: "" },
      { id: "g5", ph: "Serwis nart", span: "wide" },
      { id: "g6", ph: "Zespół Sheriff Bike", span: "" },
    ],
  },

  booking: {
    eyebrow: "Rezerwacja",
    title: "Umów wizytę\nw 30 sekund",
    lead: "Zostaw zgłoszenie, a my potwierdzimy dogodny termin telefonicznie. Rower, narty czy deska - zajmiemy się wszystkim.",
    perks: [
      "Bezpłatna wycena i diagnoza",
      "Typowy czas realizacji do 48h",
      "Oryginalne części i gwarancja na usługę",
    ],
  },

  contact: {
    address: "kmdr. T. Bramińskiego 11",
    city: "80-180 Gdańsk",
    hours: [
      { d: "Pon - Pt", h: "10:00 - 18:00", closed: false },
      { d: "Sobota",   h: "10:00 - 14:00", closed: false },
      { d: "Niedziela", h: "Zamknięte",    closed: true },
    ],
    social: {
      facebook: "https://facebook.com",
      instagram: "https://instagram.com",
      google: "https://www.google.com/maps",
    },
    blurb: "Nowoczesny serwis rowerowy z sercem do detalu. Latem rowery, zimą narty i snowboard.",
  },

  theme: { accent: "#D9601C" },
};

const STORE_KEY = "sheriff:content:v1";
const API_BASE = "/api";

function deepMerge(base, over) {
  if (Array.isArray(over)) return over.slice();
  if (over && typeof over === "object") {
    const out = Array.isArray(base) ? [] : { ...(base || {}) };
    for (const k of Object.keys({ ...(base || {}), ...over })) {
      out[k] = (k in over) ? deepMerge(base ? base[k] : undefined, over[k]) : base[k];
    }
    return out;
  }
  return over === undefined ? base : over;
}

export const ContentStore = {
  async load() {
    try {
      const r = await fetch(`${API_BASE}/content`);
      if (r.ok) {
        const data = await r.json();
        return deepMerge(DEFAULT_CONTENT, data || {});
      }
    } catch (e) {
      console.warn("API load failed, using defaults", e);
    }
    return structuredClone(DEFAULT_CONTENT);
  },

  async save(content, token) {
    const r = await fetch(`${API_BASE}/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + (token || "") },
      body: JSON.stringify(content),
    });
    if (!r.ok) throw new Error("Zapis nie powiódł się (" + r.status + ")");
    return r.json();
  },

  async reset(token) {
    return this.save(structuredClone(DEFAULT_CONTENT), token);
  },

  key: STORE_KEY,
};
