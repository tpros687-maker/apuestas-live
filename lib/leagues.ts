// Códigos de liga de ESPN. Para agregar otra: buscá el partido en espn.com,
// la URL de la liga trae el código (ej. .../liga/_/nombre/uru.1).
export const LEAGUES: { code: string; name: string }[] = [
  { code: "uru.1", name: "🇺🇾 Uruguay – Primera" },
  { code: "arg.1", name: "🇦🇷 Argentina – Liga Profesional" },
  { code: "bra.1", name: "🇧🇷 Brasil – Serie A" },
  { code: "conmebol.libertadores", name: "🏆 Copa Libertadores" },
  { code: "conmebol.sudamericana", name: "🏆 Copa Sudamericana" },
  { code: "uefa.champions", name: "⭐ Champions League" },
  { code: "uefa.europa", name: "🟠 Europa League" },
  { code: "uefa.europa.conf", name: "🟢 Conference League" },
  { code: "eng.1", name: "🏴 Premier League" },
  { code: "esp.1", name: "🇪🇸 LaLiga" },
  { code: "ita.1", name: "🇮🇹 Serie A" },
  { code: "ger.1", name: "🇩🇪 Bundesliga" },
  { code: "fra.1", name: "🇫🇷 Ligue 1" },
  { code: "por.1", name: "🇵🇹 Portugal – Liga" },
  { code: "ned.1", name: "🇳🇱 Eredivisie" },
  { code: "mex.1", name: "🇲🇽 Liga MX" },
  { code: "usa.1", name: "🇺🇸 MLS" },
  { code: "fifa.worldq.conmebol", name: "🌎 Eliminatorias Sudamericanas" },
  { code: "fifa.friendly", name: "🤝 Amistosos internacionales" },
];

export const leagueName = (code: string) =>
  LEAGUES.find((l) => l.code === code)?.name ?? code;
