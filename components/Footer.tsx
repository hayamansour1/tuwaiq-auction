import { LINKEDIN_URL } from "@/lib/links";

export default function Footer() {
  return (
    <footer className="border-t border-[#EDEDED] bg-white">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-0.5 px-4 py-3 text-center text-[10px] text-[#262626]/55 md:py-4 md:text-xs">
        <p>Built with ❤️ for Tuwaiq Club</p>

        <a
          href={LINKEDIN_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold text-[#4F29B7] hover:text-[#A380FF]"
        >
          Developed by Haya Mansour
        </a>

        <p>Version 1.0</p>
      </div>
    </footer>
  );
}