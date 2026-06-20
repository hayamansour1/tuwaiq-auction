"use client";

import Image from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

const AUCTION_URL = "https://auction.tuwaiq.club/";

export default function Home() {
  const [name, setName] = useState("");
  const router = useRouter();

  async function joinAuction() {
    const cleanName = name.trim();

    if (!cleanName) return alert("اكتبي الاسم أولًا");

    const { data: existingMember } = await supabase
      .from("members")
      .select("*")
      .ilike("name", cleanName)
      .maybeSingle();

    if (existingMember) {
      return alert("هذا الاسم مستخدم بالفعل، اختاري اسمًا مختلفًا");
    }

    const { data, error } = await supabase
      .from("members")
      .insert({ name: cleanName, points: 1000 })
      .select()
      .single();

    if (error) {
      if (error.message.includes("duplicate")) {
        return alert("هذا الاسم مستخدم بالفعل");
      }

      return alert(error.message);
    }

    localStorage.setItem("memberId", data.id);
    localStorage.setItem("memberName", data.name);
    router.push("/bid");
  }

  return (
    <section className="mx-auto flex max-w-5xl items-center justify-center px-4 py-5 md:py-8">
      <div className="card grid w-full overflow-hidden md:grid-cols-[1fr_0.9fr]">
        <div className="bg-[#4F29B7] p-6 text-white md:p-8">
          <Image src="/twq-logo.png" alt="Tuwaiq Club Logo" width={58} height={58} />

          <h2 className="mt-6 text-3xl font-bold md:text-4xl">مزاد طويق</h2>

          <p className="mt-3 max-w-sm text-sm leading-7 text-white/80 md:text-base">
            منصة رقمية داخلية لإدارة مزادات نقاط طويق بطريقة منظمة ولحظية.
          </p>

          <div className="mt-6 rounded-2xl bg-white/10 p-4">
            <p className="text-xs text-white/70">رصيد البداية لكل عضو</p>
            <p className="mt-1 text-2xl font-bold text-[#57E3D8]">1000 TP</p>
          </div>

          <div className="mt-5 rounded-2xl bg-white p-4 text-center text-[#262626]">
            <p className="mb-3 text-xs font-semibold text-[#4F29B7]">
              امسح للدخول للمزاد
            </p>

            <div className="mx-auto flex w-fit rounded-xl bg-white p-2">
              <QRCodeSVG value={AUCTION_URL} size={120} />
            </div>

            <p className="mt-3 text-[11px] text-[#262626]/60">
              {AUCTION_URL}
            </p>
          </div>
        </div>

        <div className="p-6 md:p-8">
          <p className="text-xs font-semibold text-[#4F29B7]">الانضمام للمزاد</p>

          <h1 className="mt-2 text-2xl font-bold text-[#262626] md:text-3xl">
            أدخل اسم العضو
          </h1>

          <p className="mt-2 text-sm text-[#262626]/60">
            لا يوجد تسجيل دخول، فقط الاسم والرصيد الافتراضي.
          </p>

          <div className="mt-6">
            <label className="mb-2 block text-sm font-medium">اسم العضو</label>

            <input
              className="input"
              placeholder="مثال: هيا"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />

            <button onClick={joinAuction} className="btn-primary mt-4 w-full">
              دخول المزاد
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}