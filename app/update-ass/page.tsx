"use client";

export default function UpdateAgent() {

  const updateAgent = async () => {
    await fetch(`/api/update-agent`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_name: "ass", language:"ar-eg" }),
      });
  };

  return (
    <div className="p-4 max-w-md mx-auto">
     <button
        // onClick={updateAgent}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
        // disabled={isLoading}
      >
        Update Agent
      </button>
    </div>
  );
}