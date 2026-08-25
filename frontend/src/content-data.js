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
    title: "Twój rower\nw rękach szeryfa",
    sub: "Profesjonalny serwis Twojego roweru oraz nart i snowboardu zimą. Diagnoza, regulacja, naprawa. Wszystko w jednym warsztacie.",
    ctaPrimary: "Umów wizytę",
    ctaSecondary: "Zobacz usługi",
  },

  // `live` marks the cells TrustStrip replaces with real Google numbers once
  // /api/reviews/ answers - the values here are the fallback when it doesn't.
  trust: [
    { k: "5,0 / 5", v: "ocena w Google", live: "rating" },
    { k: "87+", v: "zadowolonych klientów", live: "count" },
    { k: "12 lat", v: "doświadczenia" },
    { k: "48h", v: "typowy czas realizacji" },
  ],

  services: {
    eyebrow: "Co robimy",
    title: "Serwis rowerowy\nod A do Z",
    lead: [
      "Od szybkiej wymiany dętki po kompleksowy serwis Twojego roweru - dobierzemy zakres prac do Twoich potrzeb i budżetu.",
      "Każdy rower opuszcza nasz warsztat dopiero po pozytywnie zakończonej jeździe próbnej i dokładnej kontroli jakości.",
    ],
    items: [
      { icon: "gauge", tag: "Szybko", title: "Regulacje przerzutek i hamulców", price: "od 40 zł",
        desc: "Precyzyjna regulacja układu napędowego i hamulcowego, zapewniająca płynną zmianę biegów oraz skuteczne i bezpieczne hamowanie.",
        points: ["Regulacja przedniej i tylnej przerzutki", "Regulacja hamulców mechanicznych lub hydraulicznych", "Kontrola linek, pancerzy oraz zużycia elementów"], featured: false },
      { icon: "bike", tag: "Montaż", title: "Składanie roweru", price: "od 200 zł",
        desc: "Profesjonalny montaż roweru z kartonu lub po transporcie, z pełnym ustawieniem i jazdą próbną.",
        points: ["Montaż z kartonu", "Ustawienie pozycji", "Jazda próbna i korekty"], featured: false },
      { icon: "wrench", tag: "Przed sezonem", title: "Przegląd podstawowy", price: "250 zł",
        desc: "Dokładny przegląd najważniejszych podzespołów z regulacją i smarowaniem. Idealny przed sezonem.",
        points: ["Regulacja przerzutek i hamulców", "Kontrola luzów i połączeń", "Smarowanie łańcucha", "Pompowanie kół i kontrola ogumienia", "Sprawdzenie naciągu szprych", "Sprawdzenie centryczności kół", "Kontrola linek i pancerzy"], featured: false },
      { icon: "spray", tag: "Czyszczenie", title: "Przegląd podstawowy Plus", price: "350 zł",
        desc: "Rozszerzona wersja przeglądu podstawowego z dokładnym czyszczeniem napędu dla lepszej pracy i dłuższej żywotności podzespołów.",
        points: ["Wszystkie czynności z przeglądu podstawowego", "Dokładne mycie i odtłuszczenie wszystkich elementów napędu", "Ponowne smarowanie i precyzyjna regulacja przerzutek"], featured: true },
      { icon: "file", tag: "Po kolizji", title: "Kosztorys pokolizyjny", price: "220 zł",
        desc: "Przygotowujemy szczegółową ocenę stanu technicznego roweru po kolizji lub wypadku wraz z wyceną niezbędnych napraw.",
        points: ["Dokładna diagnostyka uszkodzeń", "Szczegółowy kosztorys części i robocizny", "Dokumentacja dla ubezpieczyciela"], featured: false },
      { icon: "cog", tag: "Raz na 2 lata", title: "Przegląd kompleksowy", price: "700 zł",
        desc: "Pełen serwis roweru. Dokładne czyszczenie i smarowanie każdego łożyska. Dla wymagających. Zalecany raz na 2 lata.",
        points: ["Kompletny demontaż, czyszczenie i regulacja kluczowych podzespołów", "Serwis piast, sterów i suportu", "Centrowanie kół z użyciem tensometru"], featured: false },
      { icon: "more", tag: "Pozostałe", title: "Pozostałe usługi",
        desc: "Oferujemy pełen zakres usług serwisowych - od drobnych regulacji po specjalistyczne naprawy.",
        points: ["Serwis hamulców, napędu", "Centrowanie kół oraz wymiana opon i dętek", "Montaż części, akcesoriów i przygotowanie roweru do sezonu"], featured: false },
    ],
    bookingOptions: [
      "Wymiana dętki/opony", "Regulacja przerzutek", "Regulacja hamulców",
      "Przegląd podstawowy", "Przegląd podstawowy Plus", "Przegląd roweru dziecięcego",
      "Przegląd e-bike", "Przegląd kompleksowy", "Przegląd premium",
      "Złożenie roweru z kartonu", "Czyszczenie napędu", "Centrowanie kół",
      "Odpowietrzenie hamulców", "Przechowanie zimowe", "Inne",
    ],
    ctaTitle: "Nie wiesz, czego potrzebujesz?",
    ctaDesc: "Przyjedź lub napisz - ocenimy stan roweru i zaproponujemy najlepszy zakres serwisu. Wycena zawsze bezpłatna.",
  },

  // Winter bike storage - the bridge section between the bike services and the
  // ski/snowboard ones. `service` must stay in sync with the matching entry in
  // services.bookingOptions, or the prefilled booking select renders blank.
  storage: {
    eyebrow: "Sezon zimowy",
    title: "Przechowaj rower\nu nas przez zimę",
    lead: "Nie masz gdzie trzymać roweru zimą? Zostaw go u nas. Odbierzesz na wiosnę - po przeglądzie, wyczyszczony i gotowy do jazdy.",
    price: "550 zł",
    priceNote: "za cały sezon, z przeglądem i czyszczeniem",
    service: "Przechowanie zimowe",
    cta: "Zarezerwuj miejsce",
    steps: [
      { icon: "bike",   title: "Przywieź rower",         desc: "Wpadnij jesienią, zanim zrobi się zimno. Resztą zajmiemy się my." },
      { icon: "snow",   title: "Garażujemy",             desc: "Rower stoi u nas w suchym, zamkniętym pomieszczeniu przez całą zimę." },
      { icon: "wrench", title: "Przegląd i czyszczenie", desc: "W tym czasie robimy pełny przegląd i myjemy napęd." },
      { icon: "check",  title: "Odbierasz gotowy",       desc: "Na wiosnę wsiadasz i jedziesz. Bez kurzu, bez skrzypienia." },
    ],
    perks: [
      "Suche, zamknięte pomieszczenie",
      "Przegląd i czyszczenie w cenie",
      "Odbiór na wiosnę w dogodnym terminie",
    ],
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
    address: "Kmdr. Tadeusza Bramińskiego 11",
    city: "80-180 Gdańsk",
    hours: [
      { d: "Pon - Pt", h: "10:00 - 18:00", closed: false },
      { d: "Sobota",   h: "10:00 - 14:00", closed: false },
      { d: "Niedziela", h: "Zamknięte",    closed: true },
    ],
    social: {
      facebook: "https://www.facebook.com/profile.php?id=61574532525611",
      instagram: "https://www.instagram.com/sheriffbikeserwis/",
      google: "https://maps.app.goo.gl/yGUZeYdLnXSvCuRs5",
    },
    blurb: "Nowoczesny serwis rowerowy z sercem do detalu. Latem rowery, zimą narty i snowboard.",
  },

  theme: { accent: "#D9601C" },
};
