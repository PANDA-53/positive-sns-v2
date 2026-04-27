export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F2F2F2] flex flex-col p-4">
      {/* インスタのスケルトンのようなローディング表示 */}
      <div className="animate-pulse space-y-4 w-full max-w-md mx-auto mt-20">
        <div className="h-48 bg-gray-200 rounded-[2.5rem]"></div>
        <div className="h-12 bg-gray-200 rounded-2xl w-3/4"></div>
        <div className="h-12 bg-gray-200 rounded-2xl"></div>
      </div>
    </div>
  );
}