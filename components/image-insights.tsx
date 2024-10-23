"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, ImageIcon, Loader2, X, Clipboard, SendHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useToast } from "@/hooks/use-toast"
import ReactMarkdown from 'react-markdown'
import { Skeleton } from "@/components/ui/skeleton"
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface DataRendererProps {
  data: string;
}

const DataRenderer: React.FC<DataRendererProps> = ({ data }) => {
  const [dataType, setDataType] = useState<'text' | 'json' | 'markdown' | 'html'>('text');

  useEffect(() => {
    const detectDataType = (content: string) => {
      if (content.trim().startsWith('{') && content.trim().endsWith('}')) {
        try {
          JSON.parse(content);
          return 'json';
        } catch (e) {        }
      }
      if (content.includes('```') || content.includes('`')) return 'markdown';
      if (content.includes('<') && content.includes('>')) return 'html';
      return 'text';
    };

    setDataType(detectDataType(data));
  }, [data]);

  switch (dataType) {
    case 'json':
      return (
        <SyntaxHighlighter language="json" style={vscDarkPlus}>
          {JSON.stringify(JSON.parse(data), null, 2)}
        </SyntaxHighlighter>
      );
    case 'markdown':
      return (
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
            code({className, children, ...props}) {
              const match = /language-(\w+)/.exec(className || '')
              return match ? (
                <SyntaxHighlighter
                  language={match[1]}
                  style={vscDarkPlus}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              ) : (
                <code className={className} {...props}>
                  {children}
                </code>
              )
            }
          }}
        >
          {data}
        </ReactMarkdown>
      );
    case 'html':
      return <div dangerouslySetInnerHTML={{ __html: data }} />;
    default:
      return <pre className="whitespace-pre-wrap">{data}</pre>;
  }
};

export function ImageInsights() {
  const [step, setStep] = useState(1)
  const [image, setImage] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [result, setResult] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const imageContainerRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()
  const [question, setQuestion] = useState("")

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
      setPreviewUrl(e.target?.result as string)
    }
    reader.readAsDataURL(file)
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
      toast({
        title: "Error",
        description: "Please upload an image first.",
        variant: "destructive",
      })
      return
    }
    if (!question.trim()) {
      toast({
        title: "Error",
        description: "Please enter a question about the image.",
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
      formData.append('question', question)

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
          variant: "success",
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
            <CardTitle className="text-3xl font-bold text-center text-primary">AI Image Bot</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold mb-2">1. Upload an Image</h2>
                  <p className="text-xs text-gray-500 mb-2">Select or drag and drop an image for analysis</p>
                  <div
                    className={cn(
                      "my-4 flex aspect-square w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-100 overflow-hidden",
                      previewUrl ? "border-transparent" : "transition-colors hover:border-primary"
                    )}
                    ref={imageContainerRef}
                  >
                    {previewUrl ? (
                      <Dialog>
                        <DialogTrigger asChild>
                          <div className="relative flex h-full w-full items-center justify-center cursor-pointer">
                            <img
                              src={previewUrl}
                              alt="Uploaded image"
                              className="max-h-full max-w-full object-contain"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                              <ImageIcon className="h-8 w-8 text-white" />
                              <span className="ml-2 text-white">Click to enlarge</span>
                            </div>
                          </div>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                          <img
                            src={previewUrl}
                            alt="Uploaded image"
                            className="w-full h-auto"
                          />
                        </DialogContent>
                      </Dialog>
                    ) : (
                      <Label
                        htmlFor="image-upload"
                        className="flex w-full h-full grow cursor-pointer items-center justify-center"
                      >
                        <div className="flex flex-col items-center">
                          <Upload className="mb-2 h-12 w-12" />
                          <span className="text-center">Upload image for analysis</span>
                          <span className="text-sm text-gray-500 mt-2">Click or drag and drop</span>
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
                  {previewUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full hover:text-red-500 hover:border-red-400"
                      onClick={handleRemoveImage}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Remove Image
                    </Button>
                  )}
                </div>

                <div>
                  <h2 className="text-lg font-semibold mb-2">2. Ask a Question</h2>
                  <p className="text-xs text-gray-500 mb-2">Enter a question about the image</p>
                  <Textarea
                    placeholder="What do you want to know about this image?"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    className="w-full mb-2"
                  />
                </div>

                {error && <p className="text-red-500 text-sm mt-2">{error}</p>}

                <div>
                  <Button
                    className="w-full transition-all duration-300 transform hover:scale-105 rounded-full"
                    onClick={handleAnalyze}
                    disabled={!image || !question.trim() || loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Thinking...
                      </>
                    ) : (
                      <>
                        Submit
                        <SendHorizontal className="mr-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex flex-col h-full">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-xl font-semibold">AI Response</h2>
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
                <div className="bg-white p-4 rounded-lg shadow-inner flex-grow overflow-hidden">
                  <div className="h-[calc(100vh-20rem)] overflow-y-auto pr-2">
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
                      <DataRenderer data={result} />
                    ) : (
                      <p className="text-sm text-gray-400 italic">Insights will appear here after analysis</p>
                    )}
                  </div>
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
