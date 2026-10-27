import { cva, type VariantProps } from 'class-variance-authority'
export { default as Button } from './Button.vue'
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  { variants: { variant: { default: 'bg-primary text-primary-foreground hover:opacity-90', outline: 'border border-input bg-background hover:bg-muted' }, size: { default: 'h-10 px-4 py-2', sm: 'h-9 px-3' } }, defaultVariants: { variant: 'default', size: 'default' } },
)
export type ButtonVariants = VariantProps<typeof buttonVariants>
