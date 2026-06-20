"use client";

import Confetti from "react-confetti";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BidWithMember, Member, Round } from "@/lib/types";

function parseSupabaseTime(value: string) {
  const normalized = value.replace(" ", "T");
  return new Date(normalized.endsWith("Z") ? normalized : `${normalized}Z`).getTime();
}

function formatTime(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export default function DisplayPage() {
  const [round, setRound] = useState<Round | null>(null);
  const [highestBid, setHighestBid] = useState<BidWithMember | null>(null);
  const [participants, setParticipants] = useState(0);
  const [winner, setWinner] = useState<Member | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const stoppingRef = useRef(false);

  const loadData = useCallback(async () => {
    const { count } = await supabase
      .from("members")
      .select("*", { count: "exact", head: true });

    setParticipants(count || 0);

    const { data: roundData } = await supabase
      .from("rounds")
      .select("*")
      .in("status", ["active", "finished", "stopped"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentRound = roundData as Round | null;
    setRound(currentRound);

    if (!currentRound) {
      setHighestBid(null);
      setWinner(null);
      return;
    }

    const { data: bidData } = await supabase
      .from("bids")
      .select("*, members(name)")
      .eq("round_id", currentRound.id)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle();

    setHighestBid(bidData as BidWithMember | null);

    if (currentRound.winner_id) {
      const { data: winnerData } = await supabase
        .from("members")
        .select("*")
        .eq("id", currentRound.winner_id)
        .maybeSingle();

      setWinner(winnerData as Member | null);
    } else {
      setWinner(null);
    }
  }, []);

  const stopRoundOnly = useCallback(
    async (currentRound: Round) => {
      if (stoppingRef.current || currentRound.status !== "active") return;

      stoppingRef.current = true;

      await supabase
        .from("rounds")
        .update({ status: "stopped" })
        .eq("id", currentRound.id)
        .eq("status", "active");

      stoppingRef.current = false;
      void loadData();
    },
    [loadData]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    const channel = supabase
      .channel("display-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => void loadData())
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  useEffect(() => {
    function updateCountdown() {
      if (!round?.started_at || round.status !== "active") {
        setTimeLeft(0);
        return;
      }

      const start = parseSupabaseTime(round.started_at);
      const end = start + Number(round.duration_seconds) * 1000;
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));

      setTimeLeft(left);

      if (left === 0) {
        void stopRoundOnly(round);
      }
    }

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);

    return () => clearInterval(timer);
  }, [round, stopRoundOnly]);

  const hasWinner = Boolean(winner && round?.status === "finished");

  return (
    <section className="mx-auto max-w-6xl px-4 py-4 md:px-6 md:py-6">
      {!round ? (
        <div className="card mx-auto max-w-3xl p-8 text-center">
          <p className="text-xs font-semibold text-[#4F29B7]">شاشة العرض</p>
          <h1 className="mt-2 text-3xl font-bold text-[#262626]">
            بانتظار بدء المزاد
          </h1>
          <p className="mt-2 text-sm text-[#262626]/60">
            سيتم عرض الغنيمة الحالية عند بدء الجولة من لوحة الإدارة.
          </p>
        </div>
      ) : hasWinner ? (
        <div className="relative">
          <Confetti
            recycle={false}
            numberOfPieces={350}
            gravity={0.16}
            wind={0.01}
            tweenDuration={6000}
          />

          <div className="card relative mx-auto max-w-4xl overflow-hidden p-8 text-center md:p-12">
            <div className="absolute inset-0 bg-[#57E3D8]/20" />
            <div className="absolute -top-16 right-10 h-36 w-36 rounded-full bg-[#A380FF]/30 blur-3xl" />
            <div className="absolute -bottom-16 left-10 h-36 w-36 rounded-full bg-[#F4A664]/30 blur-3xl" />

            <div className="relative animate-[winnerPop_0.7s_ease-out]">
              <p className="text-sm font-bold text-[#4F29B7]">إعلان الفائز</p>

              <div className="mx-auto mt-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#4F29B7] text-4xl text-white shadow-xl">
                🏆
              </div>

              <h1 className="mt-5 text-5xl font-black text-[#262626] md:text-6xl">
                {winner?.name}
              </h1>

              <p className="mt-4 text-3xl font-bold text-[#4F29B7]">
                {round.winning_bid} نقاط طويق
              </p>

              <p className="mt-4 text-sm text-[#262626]/60">
                الفائز بالغنيمة: {round.item_name}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="grid md:grid-cols-[1.4fr_0.8fr]">
            <div className="bg-[#4F29B7] p-6 text-white md:p-8">
              <p className="text-sm text-white/70">الغنيمة الحالية</p>

              <h1 className="mt-2 text-4xl font-bold leading-tight md:text-5xl">
                {round.item_name}
              </h1>

              <p className="mt-3 text-base leading-7 text-white/75">
                {round.description || "لا يوجد وصف للغنيمة."}
              </p>

              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/60">أعلى مزايدة</p>
                  <p className="mt-1 text-3xl font-bold text-[#57E3D8]">
                    {highestBid ? highestBid.amount : "—"}
                  </p>
                  <p className="text-xs text-white/70">TP</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/60">الوقت</p>
                  <p className="mt-1 text-3xl font-bold">{formatTime(timeLeft)}</p>
                  <p className="text-xs text-white/70">دقيقة : ثانية</p>
                </div>

                <div className="rounded-2xl bg-white/10 p-4">
                  <p className="text-xs text-white/60">المشاركون</p>
                  <p className="mt-1 text-3xl font-bold text-[#A380FF]">
                    {participants}
                  </p>
                  <p className="text-xs text-white/70">عضو</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8">
              <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-5">
                <p className="text-xs font-semibold text-[#4F29B7]">
                  صاحب أعلى مزايدة
                </p>
                <p className="mt-2 text-3xl font-bold text-[#262626]">
                  {highestBid?.members?.name ?? "لا يوجد بعد"}
                </p>
              </div>

              {round.image_url && (
                <div
                  className="mt-4 h-44 rounded-2xl border border-[#EDEDED] bg-cover bg-center md:h-56"
                  style={{ backgroundImage: `url(${round.image_url})` }}
                  aria-label={round.item_name}
                />
              )}

              {round.status === "stopped" && (
                <div className="mt-4 rounded-2xl bg-[#F4A664]/15 p-4 text-center">
                  <p className="text-sm font-bold text-[#4F29B7]">
                    انتهى الوقت
                  </p>
                  <p className="mt-1 text-xs text-[#262626]/60">
                    بانتظار إعلان الفائز من لوحة الإدارة.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes winnerPop {
          0% {
            opacity: 0;
            transform: translateY(16px) scale(0.92);
          }
          70% {
            opacity: 1;
            transform: translateY(0) scale(1.03);
          }
          100% {
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </section>
  );
}