import { CSSProperties } from "react"
import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      position="bottom-right"
      toastOptions={{
        duration: 4000,
        classNames: {
          toast: "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          title: "group-[.toast]:font-semibold group-[.toast]:text-sm group-[.toast]:text-slate-900",
          description: "group-[.toast]:text-slate-500 group-[.toast]:text-xs",
          icon: "group-[.toast]:text-teal-600",
          success: "group-[.toaster]:!bg-white group-[.toaster]:!border-teal-300 [&_svg]:!text-teal-600",
          error: "group-[.toaster]:!bg-white group-[.toaster]:!border-red-300 [&_svg]:!text-red-600",
          warning: "group-[.toaster]:!bg-white group-[.toaster]:!border-amber-300 [&_svg]:!text-amber-600",
          info: "group-[.toaster]:!bg-white group-[.toaster]:!border-blue-300 [&_svg]:!text-blue-600",
        },
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#0f172a",
          "--normal-border": "#e2e8f0",
          "--success-bg": "#f0fdfa",
          "--success-text": "#134e4a",
          "--success-border": "#99f6e4",
          "--error-bg": "#fef2f2",
          "--error-text": "#7f1d1d",
          "--error-border": "#fecaca",
        } as CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
