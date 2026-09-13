/** Frozen Strict-180 v4.1 scorer outputs. Scores are independent structural fits. */
export type StabilityLabel = 'very_high' | 'high' | 'moderate' | 'low' | 'very_low' | 'sensitive';
export interface ResultLineage { id: string; name: string; name_zh: string }
export interface PublicStability {
  index: number;
  label: StabilityLabel;
  all_variants_preserve_primary: boolean;
}
export interface ClassifiedPublicResult {
  status: 'classified';
  primary: ResultLineage;
  runner_up: ResultLineage;
  scores: Record<string, number>;
  stability: PublicStability;
  score_note: string;
  stability_note: string;
}
export interface NoClassificationPublicResult {
  status: 'no_classification';
  primary: null;
  scores: Record<string, number>;
}
export type PublicResult = ClassifiedPublicResult | NoClassificationPublicResult;
export interface RankingEntry extends ResultLineage {
  rank: number;
  score: number;
  t_score_unclipped: number;
  structural_percentile: number;
  central_score: number;
  model_band: [number, number];
  family_band: [number, number];
}
export interface ClassificationStability extends PublicStability {
  all_model_views_preserve_primary: boolean;
  all_family_jackknives_preserve_primary: boolean;
  components: {
    central_margin_structural_percentile: number;
    model_top1_agreement_pct: number;
    family_top1_agreement_pct: number;
  };
  robust_top1_margin_floor_t_points: number;
  note: string;
}
export interface PairBoundaryGeometry {
  a: string;
  b: string;
  nominal_angle_deg: number;
  family_max_share: number;
  family_neff: number;
  item_max_share: number;
  item_neff: number;
  same_pair_leave_one_item_min_angle_deg: number;
  same_pair_whole_family_dropout_min_angle_deg: number;
  corner1024_min_angle_deg: number;
  corner1024_p05_angle_deg: number;
  corner1024_p10_angle_deg: number;
  corner1024_median_angle_deg: number;
}
export interface PairStability {
  pair: string;
  central_t_gap: number;
  model_pair_agreement_pct: number;
  family_pair_agreement_pct: number;
  model_pair_margin_t_points: {min: number; p10: number; median: number};
  family_pair_margin_t_points: {min: number; p10: number; median: number};
  robust_pair_margin_floor_t_points: number;
  boundary_geometry: PairBoundaryGeometry | null;
  note: string;
}
export interface ItemContribution {
  id: string;
  format: string;
  family: string;
  winner_over_runner: number;
  winner_over_runner_t_points: number;
  winner_contribution: number;
  runner_contribution: number;
  response: Record<string, number>;
}
export interface ClassifiedDiagnosticResult {
  status: 'classified';
  model_version: string;
  ranking: RankingEntry[];
  runner_up: ResultLineage;
  winner_runner_margin: number;
  winner_runner_t_gap: number;
  margin_structural_percentile: number;
  evidence_strength_percentile: number;
  classification_stability: ClassificationStability;
  winner_runner_pair_stability: PairStability;
  model_stability: {weighted_top1_agreement: number; winner_margin_min: number; winner_margin_p10: number};
  family_stability: {top1_agreement: number; winner_margin_min: number; winner_margin_p10: number};
  centrality_offset_contribution: number;
  centrality_offset_t_points: number;
  item_contribution_sum: number;
  decomposition_error: number;
  format_margin_t_points: Record<string, number>;
  family_margin_t_points: Record<string, number>;
  strongest_items: ItemContribution[];
  item_contributions: ItemContribution[];
  note: string;
}
export interface ZeroInformationDiagnosticResult { status: 'zero_information'; model_version: string }
export type DiagnosticResult = ClassifiedDiagnosticResult | ZeroInformationDiagnosticResult;
export type ScoringResult =
  | {public: ClassifiedPublicResult; diagnostic: ClassifiedDiagnosticResult}
  | {public: NoClassificationPublicResult; diagnostic: ZeroInformationDiagnosticResult};
