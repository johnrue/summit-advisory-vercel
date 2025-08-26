export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container flex h-16 items-center justify-between">
          <h1 className="text-xl font-bold">Summit Advisory</h1>
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
      <footer className="w-full border-t bg-card text-card-foreground">
        <div className="container px-4 py-8">
          <p className="text-sm text-muted-foreground">© 2025 Summit Advisory. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}