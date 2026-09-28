import type { AppLanguage } from "@/types/i18n";

export function localizeGeneratedJobText(value: string | undefined, uiLanguage: AppLanguage, kind?: "deadline" | "nextAction" | "gap" | "budget") {
  if (!value) return value ?? "";

  const generatedText: Record<AppLanguage, Record<string, string>> = {
    pt: {
      notInformed: "Não informado",
      viewOriginalAd: "Ver anúncio original",
      nextAction: "Abrir o anúncio original e validar requisitos antes de candidatar.",
      gap: "Confirmar requisitos completos no anúncio original"
    },
    en: {
      notInformed: "Not informed",
      viewOriginalAd: "View original job post",
      nextAction: "Open the original job post and validate requirements before applying.",
      gap: "Confirm full requirements in the original job post"
    },
    es: {
      notInformed: "No informado",
      viewOriginalAd: "Ver anuncio original",
      nextAction: "Abrir el anuncio original y validar requisitos antes de postularte.",
      gap: "Confirmar requisitos completos en el anuncio original"
    }
  };

  const normalized = value.trim().toLowerCase();

  if (kind === "budget" || normalized === "não informado" || normalized === "not informed" || normalized === "no informado") {
    return generatedText[uiLanguage].notInformed;
  }

  if (kind === "deadline" || normalized === "ver anúncio original" || normalized === "view original job post" || normalized === "ver anuncio original") {
    return generatedText[uiLanguage].viewOriginalAd;
  }

  if (
    kind === "nextAction" ||
    normalized === "abrir o anúncio original e validar requisitos antes de candidatar." ||
    normalized === "open the original job post and validate requirements before applying." ||
    normalized === "abrir el anuncio original y validar requisitos antes de postularte."
  ) {
    return generatedText[uiLanguage].nextAction;
  }

  if (
    kind === "gap" ||
    normalized === "confirmar requisitos completos no anúncio original" ||
    normalized === "confirm full requirements in the original job post" ||
    normalized === "confirmar requisitos completos en el anuncio original"
  ) {
    return generatedText[uiLanguage].gap;
  }

  return value;
}
