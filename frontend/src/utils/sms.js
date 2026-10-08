// Liczenie, na ile czesci (platnych SMS-ow) dzieli sie wiadomosc.
//
// Dopoki tekst miesci sie w alfabecie GSM-7, jeden SMS ma 160 znakow (153 na czesc
// w wiadomosci dzielonej). Jeden znak spoza niego - np. ą, ę, ł - przelacza cala
// wiadomosc na UCS-2: 70 znakow na jeden SMS, 67 na czesc.

const GSM_BASIC =
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?" +
  "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
// Znaki rozszerzone GSM-7 zajmuja po 2 miejsca (znak ucieczki + znak).
const GSM_EXTENDED = "^{}\\[~]|€\f";

export function smsInfo(text) {
  let gsmLength = 0;
  let isGsm = true;
  for (const char of text) {
    if (GSM_BASIC.includes(char)) gsmLength += 1;
    else if (GSM_EXTENDED.includes(char)) gsmLength += 2;
    else { isGsm = false; break; }
  }

  // UCS-2 liczy jednostki UTF-16 - emoji zajmuje 2.
  const length = isGsm ? gsmLength : text.length;
  const single = isGsm ? 160 : 70;
  const perPart = isGsm ? 153 : 67;
  const parts = length === 0 ? 0 : length <= single ? 1 : Math.ceil(length / perPart);
  return { length, parts, unicode: !isGsm, limit: parts <= 1 ? single : parts * perPart };
}
