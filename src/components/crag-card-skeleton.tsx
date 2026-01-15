'use client'

import { Skeleton } from '@/components/ui/skeleton'

interface CragCardSkeletonProps {
  count?: number
}

export function CragCardSkeleton({ count = 3 }: CragCardSkeletonProps) {
  return (
    <div className="space-y-2">
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="flex items-center p-4 bg-white rounded-xl shadow-sm animate-fade-in-up"
          style={{ animationDelay: `${index * 50}ms` }}
        >
          {/* 岩场信息骨架 */}
          <div className="flex-1 flex flex-col gap-2">
            <Skeleton className="h-6 w-24 rounded-md" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
          </div>

          {/* 箭头骨架 */}
          <Skeleton className="w-5 h-5 rounded-full flex-shrink-0" />
        </div>
      ))}
    </div>
  )
}
