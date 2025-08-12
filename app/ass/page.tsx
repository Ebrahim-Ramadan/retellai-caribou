"use client";
import { useState } from "react";
import { RetellWebClient } from "retell-client-js-sdk";

const retellWebClient = new RetellWebClient();

export default function Home() {
  const [isCreating, setIsCreating] = useState(false);

  const createFlow = async () => {
    setIsCreating(true);
    try {
      const flow = {
        global_prompt: `
You are a friendly, bilingual Caribou Coffee assistant with full knowledge of the menu (English & Arabic preserved exactly from the JSON provided).
Always respond naturally and proactively offer relevant upsells (add-ons, larger sizes, bakery with coffee).
Always state prices in EGP and note they include VAT.
If the user asks for recommendations, suggest popular drinks or combos.
If the user speaks Arabic, reply in Arabic.
        `,
        start_speaker: "agent",
        model_temperature: 0.7,
        start_node_id: "start",
        tool_call_strict_mode: true,
        nodes: [
          {
            id: "start",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "👋 Welcome to Caribou Coffee! How can I help you today? Would you like to see our drinks, bakery, or full menu?"
            },
            edges: [
              {
                id: "ask_menu",
                transition_condition: {
                  type: "prompt",
                  prompt: "User asks for menu or specific category"
                },
                destination_node_id: "menu_lookup"
              },
              {
                id: "direct_order",
                transition_condition: {
                  type: "prompt",
                  prompt: "User starts ordering directly"
                },
                destination_node_id: "order_details"
              },
              {
                id: "ask_recommendation",
                transition_condition: {
                  type: "prompt",
                  prompt: "User asks for recommendation"
                },
                destination_node_id: "recommend"
              }
            ]
          },
          {
            id: "menu_lookup",
            type: "function",
            tool_id: "lookupMenu",
            tool_type: "custom_function",
            wait_for_result: true,
            instruction: {
              type: "prompt",
              text: "Looking up the menu based on your request: {{user_input}}"
            },
            edges: [
              {
                id: "menu_to_order",
                transition_condition: {
                  type: "equation",
                  equations: [{ variable: "lookupMenu_result", value: "success" }],
                  operator: "equal"
                },
                destination_node_id: "order_details"
              }
            ]
          },
          {
            id: "recommend",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "Our most popular drinks are the Caramel High Rise and the Turtle Mocha. Would you like to try one, or see the full menu?"
            },
            edges: [
              {
                id: "recommend_to_order",
                transition_condition: {
                  type: "prompt",
                  prompt: "User responds to recommendation"
                },
                destination_node_id: "order_details"
              }
            ]
          },
          {
            id: "order_details",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "Great choice! What size would you like? We have Small, Medium, and Large, each with its own price."
            },
            edges: [
              {
                id: "ask_addons",
                transition_condition: {
                  type: "prompt",
                  prompt: "User specifies size"
                },
                destination_node_id: "offer_addons"
              }
            ]
          },
          {
            id: "offer_addons",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "Would you like to add any extras? For example: extra espresso, flavor shots, whipped cream, or plant-based milk. Would you like a bakery item with your coffee?"
            },
            edges: [
              {
                id: "confirm_order",
                transition_condition: {
                  type: "prompt",
                  prompt: "User responds to addons"
                },
                destination_node_id: "order_confirm"
              }
            ]
          },
          {
            id: "order_confirm",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "Here’s your order summary: {{order_summary}}. Does everything look correct?"
            },
            edges: [
              {
                id: "fulfill_yes",
                transition_condition: {
                  type: "prompt",
                  prompt: "User confirms"
                },
                destination_node_id: "order_fulfill"
              },
              {
                id: "fulfill_no",
                transition_condition: {
                  type: "prompt",
                  prompt: "User requests changes"
                },
                destination_node_id: "order_details"
              }
            ]
          },
          {
            id: "order_fulfill",
            type: "function",
            tool_id: "submitOrder",
            tool_type: "custom_function",
            wait_for_result: true,
            instruction: {
              type: "prompt",
              text: "Submitting your order: {{order_data}}"
            },
            edges: [
              {
                id: "done",
                transition_condition: {
                  type: "equation",
                  equations: [{ variable: "submitOrder_result", value: "success" }],
                  operator: "equal"
                },
                destination_node_id: "end"
              }
            ]
          },
          {
            id: "end",
            type: "conversation",
            instruction: {
              type: "prompt",
              text: "✅ Your order is placed! Thank you and enjoy your coffee ☕"
            }
          }
        ]
      };

      const res = await fetch("/api/create-flow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(flow)
      });

      if (!res.ok) {
        throw new Error(`Failed to create flow: ${await res.text()}`);
      }

      const data = await res.json();
      console.log("Flow created:", data);
    } catch (err) {
      console.error("Error creating flow:", err);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="p-4">
      <button
        onClick={createFlow}
        disabled={isCreating}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-400"
      >
        {isCreating ? "Creating..." : "Create Flow"}
      </button>
    </div>
  );
}