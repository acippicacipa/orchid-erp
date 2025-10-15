import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Toaster() {
  const { toasts, dismiss } = useToast()

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((toast) => (
        <Alert
          key={toast.id}
          variant={toast.variant === 'destructive' ? 'destructive' : 'default'}
          className="w-80 shadow-lg"
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
              {toast.description && <AlertDescription>{toast.description}</AlertDescription>}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={() => dismiss(toast.id)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Alert>
      ))}
    </div>
  )
}

