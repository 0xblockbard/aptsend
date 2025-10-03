import { Link } from "react-router-dom";
import { Bird, Send, MessageSquare } from "lucide-react"; // X/Twitter, Telegram, Discord

type ChannelCard = {
  key: "twitter" | "telegram" | "discord" | "email" | "evm" | "sol";
  name: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  href: string;
};

const cards: ChannelCard[] = [
  {
    key: "twitter",
    name: "X / Twitter",
    description: "Send to anyone on X just by their handle. Claim funds at any time by syncing your X account",
    icon: Bird,
    href: "/checker?channel=twitter",
  },
  {
    key: "telegram",
    name: "Telegram",
    description: "Send to anyone on Telegram just by their handle. Claim funds at any time by syncing your Telegram account",
    icon: Send,
    href: "/checker?channel=telegram",
  },
  {
    key: "discord",
    name: "Discord",
    description: "Connect your Discord account to your wallet.",
    icon: MessageSquare,
    href: "/checker?channel=discord",
  },

  {
    key: "email",
    name: "Email",
    description: "Send to any email. Claim funds at any time by syncing your Google account",
    icon: Bird,
    href: "/checker?channel=google",
  },
  {
    key: "evm",
    name: "EVM",
    description: "Send to any EVM Address. Claim funds at any time by connecting with Metamask or Rabby",
    icon: Send,
    href: "/checker?channel=evm",
  },
  {
    key: "sol",
    name: "Solana",
    description: "Send to any Solana Address. Claim funds at any time by connecting with Phantom",
    icon: MessageSquare,
    href: "/checker?channel=sol",
  },
];

export default function SupportedChannels() {
  return (
    <section className="min-h-screen relative isolate overflow-hidden bg-white py-24 sm:py-32">
      {/* Background image (optional) */}
      <img
        alt=""
        src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=2400&q=80"
        className="pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover object-right opacity-10 md:object-center"
      />
      {/* Gradient blobs */}
      <div className="pointer-events-none hidden sm:absolute sm:-top-10 sm:right-1/2 sm:-z-10 sm:mr-10 sm:block sm:transform-gpu sm:blur-3xl">
        <div
          className="aspect-[1097/845] w-[68.5625rem] bg-gradient-to-tr from-[#ff4694] to-[#776fff] opacity-15"
          style={{ clipPath: "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)" }}
        />
      </div>

      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-2xl lg:mx-0">
          <h2 className="text-5xl font-semibold tracking-tight text-gray-900 sm:text-6xl">Supported Platforms </h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Send Aptos or Tokens to anyone on our supported platforms.
          </p>
        </div>

        <div className="mx-auto mt-12 grid max-w-2xl grid-cols-1 gap-6 lg:mx-0 lg:max-w-none lg:grid-cols-3 lg:gap-8">
          {cards.map((c) => (
            <Link
              key={c.key}
              to={c.href}
              className="group flex gap-4 rounded-xl bg-white/60 p-6 ring-1 ring-gray-900/5 backdrop-blur transition
                         hover:bg-white hover:shadow-md"
            >
              <c.icon aria-hidden="true" className="h-7 w-7 flex-none text-indigo-600" />
              <div className="text-base leading-7">
                <h3 className="font-semibold text-gray-900">{c.name}</h3>
                <p className="mt-2 text-gray-700">{c.description}</p>
                {/* <span className="mt-3 inline-block text-sm text-indigo-600 opacity-0 transition group-hover:opacity-100">
                  Check claims →
                </span> */}
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
