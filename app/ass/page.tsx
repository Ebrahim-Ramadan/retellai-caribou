"use client";
import { useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

const retellWebClient = new RetellWebClient();

export default function Home() {
  const [isCreating, setIsCreating] = useState(false);

  const createFlow = async () => {
    setIsCreating(true);
    try {
      const res = await fetch("/api/create-flow", { method: "POST" });
      const data = await res.json();
      console.log("Flow created:", data);
    } catch (err) {
      console.error(err);
    }
    setIsCreating(false);
  };

  return (
    <div>
      <button onClick={createFlow} disabled={isCreating}>
        {isCreating ? "Creating..." : "Create Flow"}
      </button>
    </div>
  );
}
