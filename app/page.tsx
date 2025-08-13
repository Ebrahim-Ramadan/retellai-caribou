"use client";

import { useEffect, useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";
import Image from "next/image";

const agentId = process.env.NEXT_PUBLIC_RETELL_AGENT_ID!;
console.log("agentId", agentId);

interface RegisterCallResponse {
  access_token: string;
}

const retellWebClient = new RetellWebClient();

export default function Home() {
  const [isCalling, setIsCalling] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isAgentTalking, setIsAgentTalking] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<string[]>([]);
  const [showOrder, setShowOrder] = useState(false);
  const [animatingItems, setAnimatingItems] = useState<number[]>([]);
  const [currentImage, setCurrentImage] = useState<string | null>(null);

  useEffect(() => {
    checkMicrophonePermission();
  }, []);

  useEffect(() => {
    if (currentOrder.length > 0) {
      setShowOrder(true);
    } else {
      setShowOrder(false);
    }
  }, [currentOrder]);

  const checkMicrophonePermission = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "microphone" as PermissionName });
      setHasPermission(permission.state === "granted");

      permission.addEventListener("change", () => {
        setHasPermission(permission.state === "granted");
      });
    } catch (err) {
      console.warn("Permission API not supported, will request permission on call start");
      setHasPermission(null);
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setHasPermission(true);
      setError(null);
      return true;
    } catch (err) {
      console.error("Microphone permission denied:", err);
      setHasPermission(false);
      setError("Microphone permission is required for voice calls. Please allow microphone access and try again.");
      return false;
    }
  };

  useEffect(() => {
    retellWebClient.on("call_started", () => {
      console.log("call started");
      setCurrentOrder([]);
      setAnimatingItems([]);
      setCurrentImage(null);
    });

    retellWebClient.on("call_ended", () => {
      console.log("call ended");
      setIsCalling(false);
      setIsAgentTalking(false);
      setCurrentImage(null);
    });

    retellWebClient.on("agent_start_talking", () => {
      console.log("agent_start_talking");
      setIsAgentTalking(true);
    });

    retellWebClient.on("agent_stop_talking", () => {
      console.log("agent_stop_talking");
      setIsAgentTalking(false);
    });

    retellWebClient.on("update", (update) => {
      if (update.transcript) {
        const messages = update.transcript.filter((item: any) => item.role && item.content);

        const orderItems =
          messages
            .filter((msg: any) => msg.role === "agent")
            .map((msg: any) => msg.content)
            .join(" ")
            .match(/(?:added|ordered|got)\s+([^.!?]+)/gi) || [];

        const newItems = orderItems.map((item) => item.replace(/(?:added|ordered|got)\s+/i, ""));

        if (newItems.length > currentOrder.length) {
          const newItemIndex = newItems.length - 1;
          setAnimatingItems((prev) => [...prev, newItemIndex]);
          setTimeout(() => {
            setAnimatingItems((prev) => prev.filter((i) => i !== newItemIndex));
          }, 600);
        }

        setCurrentOrder(newItems);

        const transcriptText = messages
          .filter((msg: any) => msg.role === "user")
          .map((msg: any) => msg.content.toLowerCase())
          .join(" ");
        if (transcriptText.includes("almond milk drink")) {
          setCurrentImage("/almond milk drink.png");
        } else if (transcriptText.includes("herbal tea")) {
          setCurrentImage("/herbal tea.png");
        } else {
          setCurrentImage(null);
        }
      }
    });

    retellWebClient.on("metadata", (metadata) => {
      // console.log(metadata);
    });

    retellWebClient.on("error", (error) => {
      console.error("An error occurred:", error);
      setError(`Call error: ${error.message || "Unknown error occurred"}`);
      setIsCalling(false);
      retellWebClient.stopCall();
    });
  }, [currentOrder]);

  const toggleConversation = async () => {
    if (isCalling) {
      retellWebClient.stopCall();
      setIsCalling(false);
    } else {
      const hasPermissionNow = hasPermission || (await requestMicrophonePermission());

      if (!hasPermissionNow) {
        return;
      }

      try {
        setError(null);
        const registerCallResponse = await registerCall(agentId);
        if (registerCallResponse.access_token) {
          await retellWebClient.startCall({
            accessToken: registerCallResponse.access_token,
          });
          setIsCalling(true);
        }
      } catch (err) {
        console.error("Failed to start call:", err);
        setError("Failed to start call. Please try again.");
        setIsCalling(false);
      }
    }
  };

  async function registerCall(agentId: string): Promise<RegisterCallResponse> {
    try {
      const response = await fetch("/api/create-web-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: agentId,
        }),
      });

      if (!response.ok) {
        let errorMessage = `HTTP Error: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error("Invalid response format - expected JSON");
      }

      const data: RegisterCallResponse = await response.json();

      if (!data.access_token) {
        throw new Error("Invalid response - missing access token");
      }

      return data;
    } catch (err) {
      console.error("Register call error:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to register call";
      throw new Error(errorMessage);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 relative overflow-hidden flex flex-col items-center">
      {/* Background decorative elements */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-10 left-10 w-32 h-32 bg-amber-800 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-40 right-20 w-24 h-24 bg-red-800 rounded-full blur-2xl animate-pulse"
          style={{ animationDelay: "1s" }}
        ></div>
        <div
          className="absolute bottom-20 left-1/3 w-40 h-40 bg-orange-800 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Header */}
      <header className="text-center py-6 px-4 w-full animate-in fade-in duration-1000">
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-600 to-red-700 rounded-full flex items-center justify-center transition-transform duration-300 hover:scale-110">
            <span className="text-white text-xl">☕</span>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-amber-800 via-red-700 to-amber-900 bg-clip-text text-transparent">
            Caribou Coffee Egypt
          </h1>
        </div>
        <p className="text-amber-700 text-lg font-medium">Voice Ordering Assistant</p>
      </header>

      {/* Main content container */}
      <main className="flex-1 flex items-center justify-center w-full px-4">
        <div className="w-full max-w-lg flex flex-col items-center gap-6">
          {/* Error message */}
          {error && (
            <div className="w-full animate-in slide-in-from-top duration-500">
              <div className="bg-red-100 border border-red-300 text-red-800 px-4 py-3 rounded-2xl max-w-md mx-auto text-center">
                <p className="text-sm font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Image display with animation */}
          {currentImage && (
            <div className="w-full max-w-xs animate-image-show">
              <Image
                src={currentImage}
                alt="Selected product"
                width={300}
                height={300}
                className="rounded-lg shadow-md object-cover transition-all duration-700 ease-out"
              />
            </div>
          )}

          {/* Welcome or Order display */}
          <div className="w-full max-w-md">
            <div
              className={`transition-all duration-700 ease-in-out ${
                showOrder ? "opacity-0 scale-95 pointer-events-none absolute" : "opacity-100 scale-100"
              }`}
            >
              <div className="text-center animate-in fade-in duration-1000">
                {/* <div
                  className={`w-24 h-24 bg-gradient-to-br from-amber-200 to-orange-200 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-500 ${
                    isCalling ? "animate-pulse scale-110" : "hover:scale-105"
                  }`}
                >
                </div> */}
                {/* <h2 className="text-2xl font-bold text-amber-800 mb-2">Ready to Order?</h2>
                <p className={`text-amber-600 text-lg transition-all duration-500 ${isCalling ? "animate-pulse" : ""}`}>
                  {isCalling ? "Listening to your order..." : "Tap the mic button below to start"}
                </p>
                {isCalling && (
                  <div className="flex items-center justify-center gap-2 mt-4 text-green-700 animate-in slide-in-from-bottom duration-500">
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="font-medium">Voice assistant is active</p>
                  </div>
                )} */}
              </div>
            </div>

            <div
              className={`transition-all duration-700 ease-in-out ${
                showOrder ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
              }`}
            >
                  <div className="space-y-4">
                  {currentOrder.map((item, index) => (
                    <div
                      key={index}
                      className={`flex animate-[growShrink_1.5s_ease-in-out_infinite] items-center gap-4 p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200 shadow-sm transition-all duration-500 hover:shadow-md hover:scale-[1.02] ${
                        animatingItems.includes(index)
                          ? "animate-in slide-in-from-left duration-600 scale-105"
                          : "animate-in fade-in slide-in-from-bottom duration-500"
                      }`}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <span
                        className={`w-10 h-10 bg-gradient-to-br from-amber-400 to-red-500 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0 transition-all duration-300 ${
                          animatingItems.includes(index) ? "animate-bounce" : ""
                        }`}
                      >
                        {index + 1}
                      </span>
                      <span className="text-gray-800 font-medium text-lg">{item}</span>
                    </div>
                  ))}
                </div>
            </div>
          </div>
        </div>
      </main>

      {/* Floating mic button */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20 animate-in slide-in-from-bottom duration-400 animate-pulse">
        <div className="flex flex-col items-center gap-4">
          {hasPermission === false && (
            <div className="bg-amber-100 border border-amber-300 text-amber-800 px-4 py-2 rounded-full text-sm font-medium animate-in slide-in-from-bottom duration-500 animate-bounce">
              🎤 Microphone access needed
            </div>
          )}

          <button
            onClick={toggleConversation}
            disabled={hasPermission === false && !isCalling}
            className={`relative w-20 h-20 rounded-full transition-all duration-500 transform hover:scale-110 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-2xl ${
              isCalling
                ? "bg-gradient-to-br from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 shadow-red-500/50 animate-pulse"
                : "bg-gradient-to-br from-amber-500 to-red-500 hover:from-amber-600 hover:to-red-600 shadow-amber-500/50"
            }`}
          >
            <div
              className={`w-full h-full rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center transition-all duration-500 ${
                isAgentTalking ? "animate-bounce scale-110" : ""
              }`}
            >
              <span
                className={`text-3xl text-white transition-all duration-300 ${isAgentTalking ? "animate-pulse" : ""}`}
              >
                {isCalling ? (isAgentTalking ? "🗣️" : "👂") : "🎤"}
              </span>
            </div>

            {isCalling && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping"></div>
                <div
                  className="absolute inset-0 rounded-full border-2 border-white/20 animate-ping"
                  style={{ animationDelay: "0.5s" }}
                ></div>
              </>
            )}
          </button>

          <p
            className={`text-amber-700 font-medium text-sm transition-all duration-300 ${isCalling ? "animate-pulse" : ""}`}
          >
            {isCalling ? "Tap to end order" : "Tap to start ordering"}
          </p>
        </div>
      </div>
    </div>
  );
}