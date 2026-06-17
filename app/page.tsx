import { LocationDetector } from '@/components/LocationDetector'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 gap-8">
      {/* Logo */}
      <div className="text-center">
        <div className="text-5xl font-black text-primary tracking-tight">
          Price<span className="text-foreground">Drop</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1 uppercase tracking-widest">Dubai</p>
      </div>

      <LocationDetector />
    </div>
  )
}
