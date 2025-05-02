"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { jsPDF } from "jspdf"
import { Loader2, Upload } from "lucide-react"
import Image from "next/image"

type DurationType = "1 Month" | "3 Months" | "6 Months" | "1 Year" | "Lifetime"

interface InvoiceData {
  customerName: string
  customerEmail: string
  product: string
  duration: DurationType
  amount: string // in BDT
  invoiceNumber: string
  date: string
  logoUrl: string | null
  logoWidth: number
  logoHeight: number
}

export default function InvoiceGenerator() {
  const [invoiceData, setInvoiceData] = useState<InvoiceData>({
    customerName: "",
    customerEmail: "",
    product: "",
    duration: "1 Month",
    amount: "",
    invoiceNumber: `INV-${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`,
    date: new Date().toISOString().split("T")[0],
    logoUrl: null,
    logoWidth: 0,
    logoHeight: 0,
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setInvoiceData((prev) => ({ ...prev, [name]: value }))
  }

  const handleDurationChange = (value: DurationType) => {
    setInvoiceData((prev) => ({ ...prev, duration: value }))
  }

  // Calculate end date based on duration and start date
  const calculateEndDate = (startDate: string, duration: DurationType): string => {
    if (duration === "Lifetime") {
      return "Lifetime"
    }

    const date = new Date(startDate)

    switch (duration) {
      case "1 Month":
        date.setMonth(date.getMonth() + 1)
        break
      case "3 Months":
        date.setMonth(date.getMonth() + 3)
        break
      case "6 Months":
        date.setMonth(date.getMonth() + 6)
        break
      case "1 Year":
        date.setFullYear(date.getFullYear() + 1)
        break
    }

    return date.toISOString().split("T")[0]
  }

  // Calculate remaining days or months
  const calculateRemaining = (startDate: string, duration: DurationType): string => {
    if (duration === "Lifetime") {
      return "Unlimited"
    }

    const start = new Date(startDate)
    const end = new Date(calculateEndDate(startDate, duration))

    // Calculate difference in days
    const diffTime = end.getTime() - start.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays <= 31) {
      return `${diffDays} days`
    } else {
      // Approximate months
      const months = Math.round(diffDays / 30)
      return `${months} months`
    }
  }

  // Logo upload handler
  const handleLogoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files || files.length === 0) return

    const file = files[0]
    const fileReader = new FileReader()

    fileReader.addEventListener("load", function () {
      // This is the base64 data URL
      const dataUrl = this.result as string

      // Create an image to get dimensions
      const tempImg = document.createElement("img")
      tempImg.addEventListener("load", () => {
        const width = tempImg.naturalWidth
        const height = tempImg.naturalHeight

        // Update state with image data and dimensions
        setLogoPreview(dataUrl)
        setInvoiceData((prev) => ({
          ...prev,
          logoUrl: dataUrl,
          logoWidth: width,
          logoHeight: height,
        }))
      })

      // Set source to load the image
      tempImg.src = dataUrl
    })

    // Read the file as data URL
    fileReader.readAsDataURL(file)
  }

  const generatePDF = () => {
    setIsGenerating(true)

    try {
      // Create new PDF document (A4 size)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      })

      // Set font
      doc.setFont("helvetica")

      // Add logo if available
      if (invoiceData.logoUrl) {
        try {
          // Calculate appropriate dimensions while maintaining aspect ratio
          const logoWidth = 50 // max width in mm
          const aspectRatio = invoiceData.logoWidth / Math.max(invoiceData.logoHeight, 1)
          const logoHeight = logoWidth / aspectRatio

          doc.addImage(invoiceData.logoUrl, "AUTO", 20, 20, logoWidth, logoHeight)
        } catch (logoError) {
          console.error("Error adding logo to PDF:", logoError)
          // Continue without the logo if there's an error
        }
      }

      // Add invoice title
      doc.setFontSize(24)
      doc.text("INVOICE", 105, 30, { align: "center" })

      // Add invoice details
      doc.setFontSize(10)
      doc.text(`Invoice Number: ${invoiceData.invoiceNumber}`, 150, 45, { align: "right" })
      doc.text(`Date: ${invoiceData.date}`, 150, 50, { align: "right" })

      // Add customer information
      doc.setFontSize(12)
      doc.text("Bill To:", 20, 70)
      doc.setFontSize(11)
      doc.text(invoiceData.customerName, 20, 77)
      doc.text(invoiceData.customerEmail, 20, 84)

      // Add subscription details
      doc.setFontSize(12)
      doc.text("Subscription Details:", 20, 95)

      // Add table header
      doc.setFillColor(240, 240, 240)
      doc.rect(20, 100, 170, 10, "F")
      doc.setFontSize(10)
      doc.text("Description", 25, 106)
      doc.text("Duration", 85, 106)
      doc.text("Remaining", 125, 106)
      doc.text("Amount", 160, 106)

      // Calculate end date and remaining time
      const endDate = calculateEndDate(invoiceData.date, invoiceData.duration)
      const remaining = calculateRemaining(invoiceData.date, invoiceData.duration)

      // Add table content
      doc.text(invoiceData.product, 25, 116)
      doc.text(invoiceData.duration, 85, 116)
      doc.text(remaining, 125, 116)

      // Fix for BDT symbol - use "BDT" text instead of the symbol
      doc.text(`BDT ${invoiceData.amount}`, 160, 116)

      // Add subscription period
      doc.setFontSize(10)
      doc.text(`Subscription Start: ${invoiceData.date}`, 25, 126)
      doc.text(`Subscription End: ${endDate}`, 125, 126)

      // Add total
      doc.line(20, 140, 190, 140)
      doc.setFontSize(12)
      doc.text("Total:", 140, 150)
      doc.setFontSize(12)

      // Fix for BDT symbol - use "BDT" text instead of the symbol
      doc.text(`BDT ${invoiceData.amount}`, 160, 150)

      // Add footer - only thank you message, no payment terms
      doc.setFontSize(10)
      doc.text("Thank you for purchasing from DigiTools Bazar", 105, 200, { align: "center" })

      // Save the PDF
      doc.save(`Invoice-${invoiceData.invoiceNumber}.pdf`)
    } catch (error) {
      console.error("Error generating PDF:", error)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="min-h-screen p-4 bg-gray-50">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-6 text-center">DigiTools Bazar Invoice Generator</h1>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-xl md:text-2xl">Invoice Information</CardTitle>
            <CardDescription>Enter the customer and subscription details to generate an invoice</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="logo-upload">Business Logo</Label>
                <div className="mt-2 flex flex-wrap items-center gap-4">
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Logo
                  </Button>
                  <input
                    type="file"
                    id="logo-upload"
                    ref={fileInputRef}
                    onChange={handleLogoUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  {logoPreview && (
                    <div className="relative h-16 w-16 overflow-hidden rounded border">
                      <Image
                        src={logoPreview || "/placeholder.svg"}
                        alt="Logo preview"
                        fill
                        className="object-contain"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="customerName">Customer Name</Label>
                  <Input
                    id="customerName"
                    name="customerName"
                    value={invoiceData.customerName}
                    onChange={handleInputChange}
                    placeholder="John Doe"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="customerEmail">Customer Email</Label>
                  <Input
                    id="customerEmail"
                    name="customerEmail"
                    type="email"
                    value={invoiceData.customerEmail}
                    onChange={handleInputChange}
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product">Product/Service</Label>
                <Input
                  id="product"
                  name="product"
                  value={invoiceData.product}
                  onChange={handleInputChange}
                  placeholder="Premium Subscription"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Subscription Duration</Label>
                  <Select
                    value={invoiceData.duration}
                    onValueChange={(value) => handleDurationChange(value as DurationType)}
                  >
                    <SelectTrigger id="duration" className="w-full">
                      <SelectValue placeholder="Select duration" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1 Month">1 Month</SelectItem>
                      <SelectItem value="3 Months">3 Months</SelectItem>
                      <SelectItem value="6 Months">6 Months</SelectItem>
                      <SelectItem value="1 Year">1 Year</SelectItem>
                      <SelectItem value="Lifetime">Lifetime</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (BDT)</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="text"
                    value={invoiceData.amount}
                    onChange={handleInputChange}
                    placeholder="1000"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="invoiceNumber">Invoice Number</Label>
                  <Input
                    id="invoiceNumber"
                    name="invoiceNumber"
                    value={invoiceData.invoiceNumber}
                    onChange={handleInputChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="date">Invoice Date</Label>
                  <Input
                    id="date"
                    name="date"
                    type="date"
                    value={invoiceData.date}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-2 pb-6 px-6">
            <Button
              onClick={generatePDF}
              disabled={isGenerating || !invoiceData.customerName || !invoiceData.product || !invoiceData.amount}
              className="w-full py-6 text-lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                "Generate Invoice PDF"
              )}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
