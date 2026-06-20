"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { BidWithMember, Member, Round } from "@/lib/types";

export default function BidPage() {
  const [member, setMember] = useState<Member | null>(null);
  const [round, setRound] = useState<Round | null>(null);
  const [highestBid, setHighestBid] = useState<BidWithMember | null>(null);
  const [amount, setAmount] = useState("");

  const loadData = useCallback(async () => {
    const memberId = localStorage.getItem("memberId");

    if (!memberId) {
      setMember(null);
      return;
    }

    const { data: memberData } = await supabase
      .from("members")
      .select("*")
      .eq("id", memberId)
      .maybeSingle();

    const { data: roundData } = await supabase
      .from("rounds")
      .select("*")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentMember = memberData as Member | null;
    const currentRound = roundData as Round | null;

    setMember(currentMember);
    setRound(currentRound);

    if (!currentRound) {
      setHighestBid(null);
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadData();
    }, 0);

    const channel = supabase
      .channel("bid-page")
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => void loadData())
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function placeBid() {
    if (!round || !member) return;

    const bidAmount = Number(amount);

    if (!bidAmount || bidAmount <= 0) return alert("الرجاء إدخال مبلغ صحيح");
    if (bidAmount > member.points) return alert("المبلغ أكبر من رصيدك");

    if (highestBid && bidAmount <= highestBid.amount) {
      return alert("يجب أن تكون المزايدة أعلى من أعلى مزايدة حالية");
    }

    if (highestBid?.member_id === member.id) {
      return alert("أنت صاحب أعلى مزايدة حاليًا، انتظر مزايدة أخرى.");
}

    const { error } = await supabase.from("bids").insert({
      round_id: round.id,
      member_id: member.id,
      amount: bidAmount,
    });

    if (error) return alert(error.message);

    setAmount("");
  }

  if (!member) {
    return (
      <section className="mx-auto flex max-w-md items-center justify-center px-4 py-6">
        <div className="card w-full p-5 text-center">
          <h1 className="text-2xl font-bold text-[#4F29B7]">مزاد طويق</h1>
          <p className="mt-2 text-sm text-[#262626]/60">لم يتم تسجيل اسم العضو بعد.</p>
          <Link href="/" className="btn-primary mt-4 inline-block">
            العودة لصفحة الدخول
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-3 md:px-6 md:py-5">
      <div className="mb-3 text-center">
        <p className="text-xs font-semibold text-[#4F29B7]">صفحة العضو</p>
        <h1 className="mt-1 text-xl font-bold text-[#262626] md:text-2xl">
          المزايدة على الغنيمة الحالية
        </h1>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="card p-3">
          <p className="text-[11px] text-[#262626]/50">العضو</p>
          <p className="mt-0.5 text-lg font-bold">{member.name}</p>
        </div>

        <div className="card p-3">
          <p className="text-[11px] text-[#262626]/50">رصيد نقاط طويق</p>
          <p className="mt-0.5 text-lg font-bold text-[#4F29B7]">
            {member.points} TP
          </p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {!round ? (
          <div className="p-5 text-center">
            <h2 className="text-xl font-bold text-[#4F29B7]">
              لا توجد جولة نشطة حاليًا
            </h2>
            <p className="mt-2 text-xs text-[#262626]/60">
              انتظر بدء الجولة من شاشة الإدارة.
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2">
            <div className="bg-[#4F29B7] p-4 text-white md:p-5">
              <p className="text-[11px] text-white/70">الغنيمة الحالية</p>
              <h2 className="mt-1 text-2xl font-bold md:text-3xl">
                {round.item_name}
              </h2>
              <p className="mt-2 text-xs text-white/75 md:text-sm">
                {round.description || "لا يوجد وصف"}
              </p>

              <div className="mt-4 rounded-2xl bg-white/10 p-3">
                <p className="text-[11px] text-white/70">أعلى مزايدة</p>
                <p className="mt-1 text-2xl font-bold text-[#57E3D8]">
                  {highestBid ? `${highestBid.amount} TP` : "لا توجد مزايدات"}
                </p>
                <p className="mt-1 text-xs text-white/70">
                  {highestBid?.members?.name ?? ""}
                </p>
              </div>
            </div>

            <div className="p-4 md:p-5">
              <label className="mb-1 block text-xs font-semibold">
                قيمة المزايدة
              </label>
              <input
                className="input"
                type="number"
                placeholder="مثال: 150"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />

              <button onClick={placeBid} className="btn-primary mt-3 w-full">
                زايد الآن
              </button>

              <p className="mt-2 text-center text-[10px] text-[#262626]/50">
                لا يمكن قبول مزايدة أقل أو مساوية لأعلى مزايدة حالية.
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}