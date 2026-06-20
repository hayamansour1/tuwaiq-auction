export type Member = {
  id: string;
  name: string;
  points: number;
  created_at?: string;
};

export type RoundStatus = "draft" | "active" | "stopped" | "finished";

export type Round = {
  id: string;
  item_name: string;
  description: string | null;
  image_url: string | null;
  duration_seconds: number;
  status: RoundStatus;
  started_at: string | null;
  winner_id: string | null;
  winning_bid: number | null;
  created_at?: string;
};

export type BidWithMember = {
  id: string;
  round_id: string;
  member_id: string;
  amount: number;
  created_at?: string;
  members: {
    name: string;
  } | null;
};