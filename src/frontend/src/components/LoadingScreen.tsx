export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background gap-6">
      <img
        src="/assets/generated/eq-logo.dim_512x512.png"
        alt=""
        className="h-16 w-16 animate-bounce"
      />
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="h-2.5 w-2.5 rounded-full bg-primary animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
        <p className="text-sm text-muted-foreground font-medium">
          Loading earthquake data...
        </p>
      </div>
    </div>
  );
}
