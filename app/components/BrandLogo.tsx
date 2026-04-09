import Image from 'next/image'

export default function BrandLogo() {
  return (
    <div className="flex items-center rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm">
      <Image
        src="/logo-lesath.png"
        alt="Lesath Engenharia"
        width={220}
        height={70}
        priority
        className="h-12 w-auto object-contain md:h-14"
      />
    </div>
  )
}