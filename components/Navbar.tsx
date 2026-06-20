import Image from "next/image";

export default function Navbar() {
  return (
    <header className="border-b border-[#EDEDED] bg-white">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 md:h-16 md:px-6">
        <div className="flex items-center gap-2">
          <Image
            src="/twq-logo.png"
            alt="Tuwaiq Club Logo"
            width={42}
            height={42}
            priority
            className="h-auto w-9 md:w-10"
          />

          <div>
            <h1 className="text-base font-bold leading-tight text-[#4F29B7] md:text-lg">
              مزاد طويق
            </h1>
            <p className="text-[9px] leading-tight text-[#262626]/55 md:text-[11px]">
              منصة مزاد داخلية لنادي طويق
            </p>
          </div>
        </div>

        <div className="rounded-full bg-[#4F29B7]/10 px-2.5 py-1 text-[10px] font-semibold text-[#4F29B7] md:px-3 md:text-xs">
          Tuwaiq Club
        </div>
      </div>
    </header>
  );
}