import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-none border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
    {
        variants: {
            variant: {
                default:
                    "border border-zinc-300 bg-white text-black hover:bg-zinc-50",
                secondary:
                    "border-transparent bg-zinc-100 text-black hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-50 dark:hover:bg-zinc-800/80",
                destructive:
                    "border-transparent bg-red-500 text-white hover:bg-red-600 dark:bg-red-900 dark:text-zinc-50 dark:hover:bg-red-900/80",
                outline: "border border-zinc-300 bg-white text-black",
                success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
                warning: "border-transparent bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

function Badge({ className, variant, ...props }: BadgeProps) {
    return (
        <div className={cn(badgeVariants({ variant }), className)} {...props} />
    )
}

export { Badge, badgeVariants }
