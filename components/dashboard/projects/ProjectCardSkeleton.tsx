import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export function ProjectCardSkeleton() {
  return (
    <Card className="border border-border/50 bg-background">
      <CardHeader className="pb-2">
        {/* Priority and Actions */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="w-2 h-2 rounded-full" />
            <Skeleton className="h-4 w-12 rounded-md" />
          </div>
          <Skeleton className="h-6 w-6 rounded-md" />
        </div>

        {/* Title */}
        <Skeleton className="h-4 w-3/4 mt-2" />

        {/* Category */}
        <div className="flex items-center gap-2 mt-2">
          <Skeleton className="w-3 h-3 rounded-sm" />
          <Skeleton className="h-3 w-16" />
        </div>
      </CardHeader>

      <CardContent className="pt-0 space-y-3">
        {/* Description */}
        <div className="space-y-1">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-2/3" />
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-sm" />
          <Skeleton className="h-3 w-20" />
        </div>

        {/* Budget */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-sm" />
          <Skeleton className="h-3 w-16" />
        </div>

        {/* Assigned Members */}
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-3 w-3 rounded-sm" />
          <div className="flex -space-x-1">
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
            <Skeleton className="h-5 w-5 rounded-full" />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-3 w-4" />
            </div>
            <div className="flex items-center gap-1">
              <Skeleton className="h-3 w-3 rounded-sm" />
              <Skeleton className="h-3 w-4" />
            </div>
          </div>
          <Skeleton className="h-3 w-12" />
        </div>
      </CardContent>
    </Card>
  )
}