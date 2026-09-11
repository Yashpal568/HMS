export default async function Home() {
  let healthStatus = "Loading...";
  let isSuccess = false;

  try {
    const res = await fetch("http://localhost:3001/api/v1/health", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      healthStatus = JSON.stringify(data);
      isSuccess = true;
    } else {
      healthStatus = `HTTP Error: ${res.status}`;
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    healthStatus = `Connection failed: ${message}`;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 font-sans p-4">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">HMS Foundation Verification</h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Frontend Status</h2>
            <p className="text-green-600 font-medium">Next.js is running.</p>
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-700">Backend API Status</h2>
            <p className={`font-mono p-2 rounded text-sm ${isSuccess ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
              {healthStatus}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
