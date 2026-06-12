/**
 * Nombres de selección en español por código de país (ISO2, igual que teams.country_code).
 * Los datos de la BD vienen en inglés (openfootball); esto permite buscar en español.
 * El valor puede incluir alias separados por "|" para términos alternativos de búsqueda
 * (ej. "Países Bajos|Holanda"). El primero es el nombre canónico.
 */
export const COUNTRY_ES: Record<string, string> = {
  dz: "Argelia",
  ar: "Argentina",
  au: "Australia",
  at: "Austria",
  be: "Bélgica",
  ba: "Bosnia y Herzegovina",
  br: "Brasil",
  ca: "Canadá",
  cv: "Cabo Verde",
  co: "Colombia",
  hr: "Croacia",
  cw: "Curazao",
  cz: "República Checa",
  cd: "RD Congo|Congo",
  ec: "Ecuador",
  eg: "Egipto",
  "gb-eng": "Inglaterra",
  "gb-sct": "Escocia",
  "gb-wls": "Gales",
  "gb-nir": "Irlanda del Norte",
  fr: "Francia",
  de: "Alemania",
  gh: "Ghana",
  ht: "Haití",
  ir: "Irán",
  iq: "Irak",
  ci: "Costa de Marfil",
  jp: "Japón",
  jo: "Jordania",
  mx: "México",
  ma: "Marruecos",
  nl: "Países Bajos|Holanda",
  nz: "Nueva Zelanda",
  no: "Noruega",
  pa: "Panamá",
  py: "Paraguay",
  pt: "Portugal",
  qa: "Catar|Qatar",
  sa: "Arabia Saudita|Arabia Saudí",
  sn: "Senegal",
  za: "Sudáfrica",
  kr: "Corea del Sur|Corea",
  es: "España",
  se: "Suecia",
  ch: "Suiza",
  tn: "Túnez",
  tr: "Turquía",
  uy: "Uruguay",
  us: "Estados Unidos|EEUU|USA",
  uz: "Uzbekistán",
};

/** Nombre canónico en español para mostrar (la primera variante), o null si no hay mapeo. */
export function countryEs(code: string | null | undefined): string | null {
  if (!code) return null;
  const v = COUNTRY_ES[code];
  return v ? v.split("|")[0] : null;
}
