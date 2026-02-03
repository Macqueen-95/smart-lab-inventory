import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
    "inline-flex items-center justify-center whitespace-nowrap rounded-none text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
    {
        variants: {
            variant: {
                default: "bg-white text-black border border-zinc-300 hover:bg-zinc-50 hover:text-black",
                destructive:
                    "bg-red-500 text-white hover:bg-red-600 dark:bg-red-900 dark:text-zinc-50 dark:hover:bg-red-900/90",
                outline:
                    "border border-zinc-300 bg-white text-black hover:bg-zinc-100 hover:text-black",
                secondary:
                    "bg-zinc-100 text-black hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80",
                ghost: "hover:bg-zinc-100 hover:text-black dark:hover:bg-zinc-800 dark:hover:text-zinc-50",
                link: "text-black underline-offset-4 hover:underline dark:text-zinc-50",
            },
            size: {
                default: "h-10 px-4 py-2",
                sm: "h-9 rounded-none px-3",
                lg: "h-11 rounded-none px-8",
                icon: "h-10 w-10",
            },
        },
        defaultVariants: {
            variant: "default",
            size: "default",
        },
    }
)

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, asChild = false, ...props }, ref) => {
        const Comp = asChild ? Slot : "button"
        return (
            <Comp
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                {...props}
            />
        )
    }
)
Button.displayName = "Button"

export { Button, buttonVariants }
