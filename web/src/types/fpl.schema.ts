import { z } from "zod";

export const FormationStr = z.enum(["3-4-3", "3-5-2", "4-4-2", "4-3-3", "4-5-1", "5-4-1", "5-3-2"]);

export const PredictionPlayerSchema = z.object({
    player_id: z.number(),
    name: z.string(),
    team: z.string(),
    pos: z.enum(["GK", "DEF", "MID", "FWD"]),
    predicted_points: z.number(),
    minutes_exp: z.number().optional(),
    opponent: z.string().optional(),
    is_home: z.boolean().optional(),
    opp_strength: z.number().optional(),
    price: z.number(),
});

export const PredictionsPayloadSchema = z.object({
    season: z.string(),
    gw: z.number(),
    generated_at: z.string(),
    model_version: z.string().optional(),
    method: z.string().optional(),
    players: z.array(PredictionPlayerSchema),
});

export const LineupPayloadSchema = z.object({
    season: z.string(),
    gw: z.number(),
    generated_at: z.string(),
    model_version: z.string().optional(),
    // Optional method field (e.g. 'rf', 'ma3', 'pos', 'rf_rank', 'rf_pos', 'legacy')
    methode: z.enum(['rf', 'ma3', 'pos', 'rf_rank', 'rf_pos', 'legacy']).optional(),
    formation: FormationStr,
    xi_ids: z.array(z.number()).length(11),
    bench_gk_id: z.number(),
    bench_out_ids: z.array(z.number()).length(3),
    captain_id: z.number(),
    vice_id: z.number(),
    xi_points_sum: z.number(),
    debug: z.object({ rules_ok: z.boolean().optional(), notes: z.string().optional() }).optional(),
});

export type PredictionsPayload = z.infer<typeof PredictionsPayloadSchema>;
export type LineupPayload = z.infer<typeof LineupPayloadSchema>;
export type PredictionPlayer = z.infer<typeof PredictionPlayerSchema>;
