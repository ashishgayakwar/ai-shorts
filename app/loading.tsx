export default function Loading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black text-white">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        <div className="text-sm font-semibold tracking-[0.3em] text-white">AIPMWORLD</div>
      </div>
    </div>
  );
}
