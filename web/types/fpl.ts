export type FormationStr = "3-4-3" | "3-5-2" | "4-4-2" | "4-3-3" | "4-5-1" | "5-4-1" | "5-3-2";

export interface PredictionPlayer {
    player_id: number;
    name: string;
    team: string;
    pos: "GK" | "DEF" | "MID" | "FWD";
    predicted_points: number;
    minutes_exp: number;
    opponent: string;
    is_home: boolean;
    opp_strength: number;
    price: number;
}

export interface PredictionsPayload {
    season: string;
    gw: number;
    generated_at: string;
    model_version: string;
    players: PredictionPlayer[];
}

export type PredictionMethod = 'rf' | 'ma3' | 'pos' | 'rf_rank' | 'legacy'

export interface LineupPayload {
    season: string;
    gw: number;
    generated_at: string;
    model_version: string;
    methode?: PredictionMethod;  // e.g. "rf", "ma3", "pos", "rf_rank", "legacy"
    formation: FormationStr;
    xi_ids: number[];            // 11 ints
    bench_gk_id: number;
    bench_out_ids: number[];     // 3 ints (B1,B2,B3)
    captain_id: number;
    vice_id: number;
    xi_points_sum: number;
    debug?: { rules_ok?: boolean; notes?: string };
}
