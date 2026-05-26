import Identicon from "@polkadot/react-identicon";

function sizeToPixels(size: string): number {
  if (size.includes("h-7")) return 28;
  if (size.includes("h-10")) return 40;
  if (size.includes("h-11")) return 44;
  if (size.includes("h-12")) return 48;
  if (size.includes("h-16")) return 64;
  return 40;
}

export function AddressAvatar({
  address,
  label,
  size = "h-10 w-10",
}: {
  address: string;
  label?: string;
  size?: string;
}) {
  const title = label || address;
  const pixels = sizeToPixels(size);

  return (
    <div
      className={`${size} flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--surface)] ring-1 ring-[var(--border)]`}
      aria-label={title}
      title={title}
    >
      <Identicon value={address || title} size={pixels} theme="polkadot" />
    </div>
  );
}
