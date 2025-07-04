export default function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
