import InvoiceGenerator from "./components/InvoiceGenerator"

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="py-8">
          {/* The InvoiceGenerator component is rendered directly */}
          <InvoiceGenerator />
        </div>
      </div>
    </main>
  )
}
