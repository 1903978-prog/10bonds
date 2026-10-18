import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl rounded-[28px] bg-white p-8 text-center shadow-[0_2px_20px_rgba(0,0,0,0.04)]">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-3 text-mute">This address does not exist on 10BONDS.</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-accent px-5 py-2.5 text-[15px] font-medium text-white">
        Find bonds
      </Link>
    </div>
  );
}
