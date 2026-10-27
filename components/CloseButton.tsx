"use client";
import { useRouter } from "next/navigation";

export default function CloseButton() {
  const router = useRouter();
  const close = () => {
    if (window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <button
      type="button"
      onClick={close}
      aria-label="Close"
      data-testid="close-button"
      className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full text-2xl leading-none text-mute hover:bg-black/5 sm:right-6 sm:top-6"
    >
      ×
    </button>
  );
}
