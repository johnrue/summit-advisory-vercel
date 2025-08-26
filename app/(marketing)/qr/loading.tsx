export default function QRLoading() {
  return (
    <>
      <style>{`
        @keyframes qr-spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div className="min-h-screen flex items-center justify-center p-4 bg-background">
        <div className="w-full max-w-md p-6 text-center bg-card border border-border rounded-xl shadow-lg backdrop-blur-sm">
          <div className="mb-6">
            <div className="w-16 h-16 mx-auto border-4 border-primary border-t-transparent rounded-full" 
                 style={{ animation: 'qr-spin 1s linear infinite' }} />
          </div>
          
          <h1 className="text-2xl font-semibold mb-2 text-foreground">
            Loading Summit Advisory
          </h1>
          <p className="text-muted-foreground">
            Preparing your redirect...
          </p>
        </div>
      </div>
    </>
  )
}