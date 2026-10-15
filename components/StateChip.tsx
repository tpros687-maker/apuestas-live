import type { BetState, SelState } from "@/lib/types";

const LABEL: Record<SelState | BetState, string> = {
  pending: "Por jugar",
  winning: "Va ganando",
  losing: "Va perdiendo",
  won: "Ganada",
  lost: "Perdida",
  void: "Anulada",
  "live-winning": "Va ganando",
  "live-losing": "En riesgo",
};

const CLS: Record<SelState | BetState, string> = {
  pending: "",
  winning: "winning",
  losing: "losing",
  won: "won",
  lost: "lost",
  void: "",
  "live-winning": "winning",
  "live-losing": "losing",
};

export default function StateChip({ state }: { state: SelState | BetState }) {
  return <span className={`chip ${CLS[state]}`}>{LABEL[state]}</span>;
}

export const pipClass = (s: SelState) => CLS[s];
