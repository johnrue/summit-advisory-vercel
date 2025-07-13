import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Redirecting... | Summit Advisory",
  description: "QR code redirect page for Summit Advisory security services",
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
  },
  other: {
    'refresh': '3;url=/',
  },
}

export default function QRLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
    </>
  )
}