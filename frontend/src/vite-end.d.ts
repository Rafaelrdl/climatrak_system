/// <reference types="vite/client" />
declare const GITHUB_RUNTIME_PERMANENT_NAME: string
declare const BASE_KV_SERVICE_URL: string

// React-PDF types for handling PDF documents
declare module 'react-pdf' {
  export interface DocumentProps {
    file: File | Blob | string | ArrayBuffer | Uint8Array
    onLoadSuccess?: (pdf: { numPages: number }) => void
    onLoadError?: (error: Error) => void
    loading?: React.ReactNode
  }

  export interface PageProps {
    pageNumber: number
    scale?: number
    loading?: React.ReactNode
    renderTextLayer?: boolean
    renderAnnotationLayer?: boolean
  }

  export const Document: React.FC<DocumentProps>
  export const Page: React.FC<PageProps>
  export const pdfjs: {
    GlobalWorkerOptions: {
      workerSrc: string
    }
    version: string
  }
}