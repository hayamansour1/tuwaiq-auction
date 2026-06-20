"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Member, Round } from "@/lib/types";

export default function AdminPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [rounds, setRounds] = useState<Round[]>([]);

  const [itemName, setItemName] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [duration, setDuration] = useState(60);

  const loadData = useCallback(async () => {
    const { data: membersData } = await supabase.from("members").select("*").order("created_at");
    const { data: roundsData } = await supabase.from("rounds").select("*").order("created_at", { ascending: false });

    setMembers((membersData as Member[]) || []);
    setRounds((roundsData as Round[]) || []);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void loadData(), 0);

    const channel = supabase
      .channel("admin-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "rounds" }, () => void loadData())
      .on("postgres_changes", { event: "*", schema: "public", table: "bids" }, () => void loadData())
      .subscribe();

    return () => {
      clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function addRound() {
    if (!itemName.trim()) {
      alert("الرجاء إدخال اسم الغنيمة");
      return;
    }

    const { error } = await supabase.from("rounds").insert({
      item_name: itemName,
      description,
      image_url: imageUrl || null,
      duration_seconds: duration,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setItemName("");
    setDescription("");
    setImageUrl("");
    setDuration(60);
    void loadData();
  }

  async function startRound(id: string) {
    await supabase
      .from("rounds")
      .update({
        status: "active",
        started_at: new Date().toISOString(),
        winner_id: null,
        winning_bid: null,
      })
      .eq("id", id);

    void loadData();
  }

  async function stopRound(id: string) {
    await supabase.from("rounds").update({ status: "stopped" }).eq("id", id);
    void loadData();
  }

  async function announceWinner(roundId: string) {
    const round = rounds.find((r) => r.id === roundId);

    if (round?.status === "finished") {
      alert("تم إعلان الفائز لهذه الجولة مسبقًا");
      return;
    }

    const { data: topBid } = await supabase
      .from("bids")
      .select("*")
      .eq("round_id", roundId)
      .order("amount", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!topBid) {
      alert("لا توجد مزايدات");
      return;
    }

    const { data: winner } = await supabase
      .from("members")
      .select("*")
      .eq("id", topBid.member_id)
      .single();

    if (!winner) return;

    if (winner.points < topBid.amount) {
      alert("رصيد الفائز غير كافٍ لإتمام الخصم");
      return;
    }

    await supabase
      .from("members")
      .update({ points: winner.points - topBid.amount })
      .eq("id", winner.id);

    await supabase
      .from("rounds")
      .update({
        status: "finished",
        winner_id: winner.id,
        winning_bid: topBid.amount,
      })
      .eq("id", roundId)
      .neq("status", "finished");

    void loadData();
  }

  async function deleteRound(roundId: string) {
    const ok = confirm("هل تريد حذف هذه الجولة؟ سيتم حذف مزايداتها أيضًا.");
    if (!ok) return;

    await supabase.from("bids").delete().eq("round_id", roundId);
    await supabase.from("rounds").delete().eq("id", roundId);

    void loadData();
  }

  async function resetAuction() {
    const ok = confirm(
      "هل تريد إعادة تعيين المزاد؟ سيتم حذف الجولات والمزايدات فقط، ولن يتم حذف الأعضاء."
    );

    if (!ok) return;

    await supabase.from("bids").delete().neq("amount", -1);
    await supabase.from("rounds").delete().neq("item_name", "");

    void loadData();
  }

  async function updatePoints(memberId: string, value: number) {
    await supabase.from("members").update({ points: value }).eq("id", memberId);
    void loadData();
  }

  const activeRounds = useMemo(
    () => rounds.filter((r) => r.status === "active").length,
    [rounds]
  );

  const finishedRounds = useMemo(
    () => rounds.filter((r) => r.status === "finished").length,
    [rounds]
  );

  return (
    <section className="mx-auto max-w-7xl px-5 py-10">
      <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-[#4F29B7]">لوحة الإدارة</p>
          <h1 className="mt-2 text-4xl font-bold text-[#262626]">إدارة مزاد طويق</h1>
          <p className="mt-2 text-[#262626]/60">إدارة الجولات والمشاركين ونقاط طويق.</p>
        </div>

        <button
          onClick={resetAuction}
          className="rounded-2xl bg-red-50 px-5 py-3 font-bold text-red-600 hover:bg-red-100"
        >
          إعادة تعيين الجولات والمزايدات
        </button>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="card p-5">
          <p className="text-sm text-[#262626]/50">المشاركون</p>
          <p className="mt-2 text-3xl font-bold text-[#4F29B7]">{members.length}</p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-[#262626]/50">الجولات</p>
          <p className="mt-2 text-3xl font-bold text-[#4F29B7]">{rounds.length}</p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-[#262626]/50">الجولات النشطة</p>
          <p className="mt-2 text-3xl font-bold text-[#57E3D8]">{activeRounds}</p>
        </div>

        <div className="card p-5">
          <p className="text-sm text-[#262626]/50">الجولات المنتهية</p>
          <p className="mt-2 text-3xl font-bold text-[#F4A664]">{finishedRounds}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card p-6 lg:col-span-1">
          <h2 className="mb-5 text-xl font-bold text-[#4F29B7]">إضافة غنيمة جديدة</h2>

          <input className="input mb-3" placeholder="اسم الغنيمة" value={itemName} onChange={(e) => setItemName(e.target.value)} />
          <textarea className="input mb-3" placeholder="الوصف" value={description} onChange={(e) => setDescription(e.target.value)} />
          <input className="input mb-3" placeholder="رابط الصورة" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="input mb-4" type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} />

          <button onClick={addRound} className="btn-primary w-full">
            إضافة الغنيمة
          </button>
        </div>

        <div className="card p-6 lg:col-span-2">
          <h2 className="mb-5 text-xl font-bold text-[#4F29B7]">الجولات</h2>

          <div className="space-y-4">
            {rounds.map((round) => (
              <div key={round.id} className="rounded-2xl border border-[#EDEDED] p-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h3 className="font-bold text-[#262626]">{round.item_name}</h3>
                    <p className="text-sm text-[#262626]/50">الحالة: {round.status}</p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => startRound(round.id)} className="btn-primary">
                      بدء الجولة
                    </button>

                    <button onClick={() => stopRound(round.id)} className="btn-secondary">
                      إيقاف
                    </button>

                    <button
                      onClick={() => announceWinner(round.id)}
                      className="rounded-2xl bg-[#F4A664] px-5 py-3 font-bold"
                    >
                      إعلان الفائز
                    </button>

                    <button
                      onClick={() => deleteRound(round.id)}
                      className="rounded-2xl bg-red-50 px-5 py-3 font-bold text-red-600"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {rounds.length === 0 && (
              <p className="text-center text-sm text-[#262626]/50">
                لا توجد جولات بعد.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="card mt-6 p-6">
        <h2 className="mb-5 text-xl font-bold text-[#4F29B7]">الأعضاء</h2>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EDEDED]">
                <th className="p-3 text-right">الاسم</th>
                <th className="p-3 text-right">الرصيد</th>
                <th className="p-3 text-right">تعديل</th>
              </tr>
            </thead>

            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-b border-[#EDEDED]">
                  <td className="p-3">{member.name}</td>
                  <td className="p-3 font-semibold">{member.points} TP</td>
                  <td className="p-3">
                    <input
                      className="input max-w-[140px]"
                      type="number"
                      value={member.points}
                      onChange={(e) => updatePoints(member.id, Number(e.target.value))}
                    />
                  </td>
                </tr>
              ))}

              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="p-4 text-center text-sm text-[#262626]/50">
                    لا يوجد أعضاء بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}