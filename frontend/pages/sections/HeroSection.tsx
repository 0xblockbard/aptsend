import { Link } from "react-router-dom";
import { WalletSelector } from "@/components/WalletSelector";

type Props = {
  title?: string;
  subtitle?: string;
  badgeText?: string;
  showBadge?: boolean;
  children?: React.ReactNode; // optional custom CTA area
};

export default function HeroSection({
  title = "AptSend",
  subtitle = "Send Aptos or tokens to anyone on Twitter, Telegram, Discord, Email, Phone Number, EVM or SOL addresses - even if they're not on Aptos yet",
  badgeText = "Beta Deployed on Aptos Testnet",
  showBadge = true,
  children,
}: Props) {
  return (
    <div className="min-h-screen relative isolate px-6 pt-24 pb-24 sm:pt-32 lg:px-8 lg:pt-40">
      {/* Top blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-40 -z-10 transform-gpu overflow-hidden blur-3xl sm:-top-80"
      >
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem]
                     -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr
                     from-[#ff80b5] to-[#9089fc] opacity-30 sm:left-[calc(50%-30rem)]
                     sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>

      {/* Center content */}
      <div className="mx-auto max-w-2xl py-10 sm:py-14 text-center">
        {showBadge && (
          <div className="hidden sm:mb-8 sm:flex sm:justify-center">
            <div className="relative rounded-full px-3 py-1 text-sm leading-6 text-gray-600 ring-1 ring-indigo-900/10 hover:ring-indigo-900/20 border-2 border-indigo-600/60">
              <span className="font-semibold text-indigo-600">{badgeText}</span>
            </div>
          </div>
        )}

        <h1 className="text-5xl font-semibold tracking-tight text-gray-900 sm:text-7xl">
          {title}
        </h1>
        <p className="mt-8 text-lg font-medium text-gray-500 sm:text-xl">
          {subtitle}
        </p>

        <div className="mt-10 flex items-center justify-center gap-x-6">
          {children ?? (
            <>
              <WalletSelector/>
              <Link to="/checker" className="text-sm font-semibold text-gray-900 hover:underline">
                Check claims →
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Bottom blob */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-[calc(100%-13rem)] -z-10 transform-gpu overflow-hidden blur-3xl
                   sm:top-[calc(100%-30rem)]"
      >
        <div
          className="relative left-[calc(50%+3rem)] aspect-[1155/678] w-[36.125rem]
                     -translate-x-1/2 bg-gradient-to-tr from-[#ff80b5] to-[#9089fc]
                     opacity-30 sm:left-[calc(50%+36rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </div>
  );
}
