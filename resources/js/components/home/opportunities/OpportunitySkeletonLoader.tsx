import React from "react";

const SkeletonBase = ({
  className = "",
  children,
  ...props
}: {
  className?: string;
  children?: React.ReactNode;
  [key: string]: any;
}) => (
  <div
    className={`animate-pulse bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 bg-[length:200%_100%] ${className}`}
    style={{
      backgroundImage:
        "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
      backgroundSize: "200% 100%",
      animation: "shimmer 1.5s ease-in-out infinite",
    }}
    {...props}
  >
    {children}
  </div>
);

const MobileSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 40 }).map((_, index) => (
      <div
        key={index}
        className="bg-white p-4 rounded-lg shadow-sm border border-gray-200"
      >
        <div className="mb-3">
          <SkeletonBase className="h-5 w-3/4 rounded mb-2" />
          <SkeletonBase className="h-4 w-1/3 rounded" />
        </div>
        <div className="mb-3">
          <SkeletonBase className="h-10 w-48 rounded-lg" />
        </div>
        <div className="mb-3">
          <SkeletonBase className="h-6 w-12 rounded-full" />
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm mb-3">
          <div>
            <SkeletonBase className="h-4 w-16 rounded mb-1" />
            <SkeletonBase className="h-4 w-24 rounded" />
          </div>
          <div>
            <SkeletonBase className="h-4 w-12 rounded mb-1" />
            <SkeletonBase className="h-4 w-20 rounded" />
          </div>
          <div>
            <SkeletonBase className="h-4 w-20 rounded mb-1" />
            <SkeletonBase className="h-4 w-32 rounded mb-1" />
            <SkeletonBase className="h-3 w-16 rounded" />
          </div>
          <div>
            <SkeletonBase className="h-4 w-12 rounded mb-1" />
            <SkeletonBase className="h-4 w-24 rounded" />
          </div>
        </div>
        <div className="flex justify-end space-x-2">
          <SkeletonBase className="w-8 h-8 rounded-full" />
          <SkeletonBase className="w-8 h-8 rounded-full" />
        </div>
      </div>
    ))}
  </div>
);

const DesktopSkeleton = ({ isFirstPage = true }: { isFirstPage?: boolean }) => (
  <div className="shadow-md sm:rounded-lg border border-gray-200">
    <div className="overflow-x-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        {isFirstPage && (
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-16">
                Select
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Opportunity Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Name/Institution
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                Stage
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Probability
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Amount(Ksh)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Last Activity
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Created At
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-28">
                Close Date
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                Opportunity Clerk
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                Actions
              </th>
            </tr>
          </thead>
        )}
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: 40 }).map((_, index) => (
            <tr key={index} className="hover:bg-gray-50">
              <td className="px-4 py-4 whitespace-nowrap w-16">
                <SkeletonBase className="w-5 h-5 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-32">
                <SkeletonBase className="h-4 w-28 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-48">
                <SkeletonBase className="h-4 w-40 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-48">
                <SkeletonBase className="h-10 w-44 rounded-lg" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-24">
                <SkeletonBase className="h-6 w-12 rounded-full" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-28">
                <SkeletonBase className="h-4 w-20 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-32">
                <div className="flex flex-col space-y-1">
                  <SkeletonBase className="h-4 w-24 rounded" />
                  <SkeletonBase className="h-3 w-16 rounded" />
                </div>
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-28">
                <SkeletonBase className="h-4 w-20 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-28">
                <SkeletonBase className="h-4 w-20 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap w-32">
                <SkeletonBase className="h-4 w-24 rounded" />
              </td>
              <td className="px-4 py-4 whitespace-nowrap text-right w-24">
                <div className="flex items-center justify-end space-x-2">
                  <SkeletonBase className="w-8 h-8 rounded-full" />
                  <SkeletonBase className="w-8 h-8 rounded-full" />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

const OpportunitySkeletonLoader = ({
  isMobileView = false,
  isFirstPage = true,
}: {
  isMobileView?: boolean;
  isFirstPage?: boolean;
}) => (
  <div>
    {/* {isFirstPage && (
      <div className="mb-4">
        <SkeletonBase className="h-4 w-48 rounded" />
      </div>
    )} */}
    {isMobileView ? (
      <MobileSkeleton />
    ) : (
      <DesktopSkeleton isFirstPage={isFirstPage} />
    )}
  </div>
);

export default OpportunitySkeletonLoader;
