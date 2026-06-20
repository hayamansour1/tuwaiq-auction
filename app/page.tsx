"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Home() {
  const [name, setName] = useState("");
  const router = useRouter();

  async function joinAuction() {
    const cleanName = name.trim();

    if (!cleanName) return alert("اكتب اسمك للانضمام للمزاد");

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
    <section className="mx-auto flex min-h-[calc(100vh-150px)] max-w-xl items-center justify-center px-4 py-6">
      <div className="card w-full p-6 text-center md:p-8">
        <p className="text-xs font-semibold text-[#4F29B7]">
          الانضمام للمزاد
        </p>

        <h1 className="mt-2 text-3xl font-bold text-[#262626] md:text-4xl">
          أدخل اسم العضو
        </h1>

        <p className="mt-2 text-sm text-[#262626]/60">
          لا يوجد تسجيل دخول، فقط الاسم ورصيد نقاط طويق.
        </p>

        <div className="mt-6 text-right">
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
    </section>
  );
}