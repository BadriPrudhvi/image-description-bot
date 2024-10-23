"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, Image as ImageIcon, Loader2, X, Clipboard } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import { Skeleton } from "@/components/ui/skeleton"

const languages = [
  { value: "english", label: "English" },
  { value: "spanish", label: "Spanish" },
  { value: "german", label: "German" },
  { value: "french", label: "French" },
  { value: "portuguese", label: "Portuguese" },
  { value: "italian", label: "Italian" },
  { value: "hindi", label: "Hindi" },
  { value: "thai", label: "Thai" },
]

const descriptionLengths = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
]

export function ImageInsights() {
  const [step, setStep] = useState(1)
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [language, setLanguage] = useState("english")
  const [length, setLength] = useState("short")
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImage(file)
      createImagePreview(file)
      setStep(2)
      setError(null)
    }
  }

  const createImagePreview = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        if (imageContainerRef.current) {
          const { width: containerWidth, height: containerHeight } = imageContainerRef.current.getBoundingClientRect()
          const { width: imgWidth, height: imgHeight } = img
          const { width: finalWidth, height: finalHeight } = calculateImageDimensions(containerWidth, containerHeight, imgWidth, imgHeight)

          const canvas = document.createElement('canvas')
          canvas.width = finalWidth
          canvas.height = finalHeight
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, finalWidth, finalHeight)
          setPreviewUrl(canvas.toDataURL())
        }
      }
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const calculateImageDimensions = (containerWidth: number, containerHeight: number, imgWidth: number, imgHeight: number) => {
    const imgRatio = imgWidth / imgHeight
    const containerRatio = containerWidth / containerHeight
    let finalWidth, finalHeight

    if (imgRatio > containerRatio) {
      finalWidth = containerWidth
      finalHeight = containerWidth / imgRatio
    } else {
      finalHeight = containerHeight
      finalWidth = containerHeight * imgRatio
    }

    return { width: finalWidth, height: finalHeight }
  }

  const handleRemoveImage = () => {
    setImage(null)
    setPreviewUrl(null)
    setStep(1)
    setResult(null)
  }

  const convertImageToUint8Array = (file: File): Promise<Uint8Array> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result instanceof ArrayBuffer) {
          const uint8Array = new Uint8Array(event.target.result);
          resolve(uint8Array);
        } else {
          reject(new Error("Failed to convert image to Uint8Array"));
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsArrayBuffer(file);
    });
  };

  const handleAnalyze = async () => {
    if (!image) {
      setError("Please upload an image first.")
      toast({
        title: "Error",
        description: "Please upload an image first.",
        variant: "destructive",
      })
      return
    }
    setLoading(true)
    setError(null)
    const startTime = Date.now()
    try {
      const formData = new FormData()
      formData.append('image', image)
      formData.append('language', language)
      formData.append('length', length)

      const response = await fetch('/api/generate_insights', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Failed to generate insights')
      }

      const data = await response.json() as { insights?: string }
      if (data.insights) {
        setResult(data.insights)
        setStep(4)
        const endTime = Date.now()
        const timeTaken = ((endTime - startTime) / 1000).toFixed(2)
        toast({
          title: "Success",
          description: `Took ${timeTaken} seconds to generate insights.`,
          variant: "default",
          className: "bg-green-400 text-white",
        })
      } else {
        throw new Error('Unexpected response format')
      }
    } catch (err) {
      setError("An error occurred while analyzing the image. Please try again.")
      const endTime = Date.now()
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2)
      toast({
        title: "Error",
        description: `Failed to generate insights. Took ${timeTaken} seconds. Please try again.`,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (result) {
      navigator.clipboard.writeText(result).then(() => {
        toast({
          title: "Copied!",
          description: "Insights copied to clipboard",
          variant: "default",
          className: "bg-blue-400 text-white",
        })
      }).catch((err) => {
        console.error('Failed to copy text: ', err)
        toast({
          title: "Error",
          description: "Failed to copy insights",
          variant: "destructive",
        })
      })
    }
  }

  useEffect(() => {
    const handleResize = () => {
      if (image) {
        createImagePreview(image)
      }
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [image])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-100 to-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center text-primary">AI Image Insights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">1. Upload an Image</h2>
                  <p className="text-xs text-gray-500 mb-2">Select or drag and drop an image for analysis</p>
                  <div
                    className={`${previewUrl ? "border-transparent" : "transition-colors hover:border-primary"} my-4 flex aspect-[3] flex-col items-center justify-center rounded-lg border-2 border-dashed`}
                    ref={imageContainerRef}
                  >
                    {previewUrl ? (
                      <div className="relative flex h-full max-h-full w-full items-center justify-center">
                        <img
                          src={previewUrl}
                          alt="Uploaded image"
                          className="h-full rounded object-contain"
                        />
                        <Button
                          variant="default"
                          size="icon"
                          className="absolute right-0 top-0"
                          onClick={handleRemoveImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <Label
                        htmlFor="image-upload"
                        className="flex w-full grow cursor-pointer items-center justify-center"
                      >
                        <div className="flex flex-col items-center">
                          <Upload className="mb-2 h-8 w-8" />
                          <span>Upload image for analysis</span>
                        </div>
                        <input
                          id="image-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                        />
                      </Label>
                    )}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">2. Language</h2>
                  <p className="text-xs text-gray-500 mb-2">Choose the language for the generated insights</p>
                  <Select value={language} onValueChange={(value) => { setLanguage(value); setStep(3); }}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>
                          {lang.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">3. Length</h2>
                  <p className="text-xs text-gray-500 mb-2">Select the desired length of the insights</p>
                  <RadioGroup value={length} onValueChange={(value) => setLength(value)}>
                    <div className="flex justify-between">
                      {descriptionLengths.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <RadioGroupItem value={option.value} id={option.value} />
                          <Label htmlFor={option.value}>{option.label}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                </div>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div>
                        <Button
                          className="w-full transition-all duration-300 transform hover:scale-105"
                          onClick={handleAnalyze}
                          disabled={!image || loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Analyzing...
                            </>
                          ) : (
                            <>
                              <ImageIcon className="mr-2 h-4 w-4" />
                              Analyze Image
                            </>
                          )}
                        </Button>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{image ? "Click to analyze the image" : "Please upload an image first"}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">AI-Generated Insights</h2>
                  {result && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={copyToClipboard}
                          >
                            <Clipboard className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Copy insights to clipboard</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                </div>
                <div className="bg-white p-4 rounded-lg shadow-inner h-[calc(100%-2rem)] overflow-auto">
                  {loading ? (
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[90%]" />
                      <Skeleton className="h-4 w-[95%]" />
                      <Skeleton className="h-4 w-[85%]" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-[92%]" />
                    </div>
                  ) : result ? (
                    <ReactMarkdown 
                      className="text-sm text-gray-600 prose prose-sm max-w-none insights-markdown"
                      components={{
                        h1: ({node, ...props}) => <h1 className="text-xl font-bold mt-4 mb-2" {...props} />,
                        h2: ({node, ...props}) => <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />,
                        h3: ({node, ...props}) => <h3 className="text-base font-medium mt-2 mb-1" {...props} />,
                        p: ({node, ...props}) => <p className="mb-4" {...props} />,
                        ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-4" {...props} />,
                        ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-4" {...props} />,
                        li: ({node, ...props}) => <li className="mb-1" {...props} />,
                        blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-gray-300 pl-4 italic my-4" {...props} />,
                      }}
                    >
                      {result}
                    </ReactMarkdown>
                  ) : (
                    <p className="text-sm text-gray-400 italic">Insights will appear here after analysis</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      <footer className="text-center p-4 text-sm text-orange-500s">
        <p>
          Powered by{' '}
          <a 
            href="https://developers.cloudflare.com/workers-ai/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            Cloudflare Workers AI
          </a>
          {' '}using{' '}
          <a 
            href="https://developers.cloudflare.com/workers-ai/models/llama-3.2-11b-vision-instruct/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-orange-500 hover:underline"
          >
            Meta Llama 3.2 Vision
          </a>
        </p>
      </footer>
    </div>
  )
}
