import { useWallet } from "@aptos-labs/wallet-adapter-react";

export function Footer() {
  const { connected } = useWallet();
  
  const publicLinks = [
    { name: 'Home', href: '/' },
    { name: 'Checker', href: '/checker' },
  ];
  
  const connectedLinks = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Checker', href: '/checker' },
    { name: 'Send', href: '/send' },
  ];
  
  const links = connected 
    ? [...connectedLinks]
    : publicLinks;

  return (
    <footer className="bg-white dark:bg-gray-900">
      <div className="mx-auto max-w-7xl overflow-hidden px-6 py-12 sm:py-12 lg:px-8">
        <nav aria-label="Footer" className="-mb-6 flex flex-wrap justify-center gap-x-12 gap-y-3 text-sm/6">
          {links.map((item) => (
            <a
              key={item.name}
              href={item.href}
              className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
            >
              {item.name}
            </a>
          ))}
        </nav>
        <p className="mt-10 text-center text-sm/6 text-gray-600 dark:text-gray-400">
          &copy; 2025 AptSend. All rights reserved.
        </p>
      </div>
    </footer>
  );
}