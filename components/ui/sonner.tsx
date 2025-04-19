"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-red-500 group-[.toaster]:border-red-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-red-400",
          actionButton:
            "group-[.toast]:bg-red-500 group-[.toast]:text-white",
          cancelButton:
            "group-[.toast]:bg-red-100 group-[.toast]:text-red-500",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }