import { NextResponse } from "next/server";
import { RetellClient } from "retell-client-js-sdk/server"; // Node/server import

const client = new RetellClient({
  apiKey: "key_e9d61536e4116f33e292c0a41242", // keep your key secret
});

export async function POST() {
  const flow = {
    global_prompt: `
You are a friendly bilingual coffee shop assistant with full knowledge of the menu (English & Arabic preserved exactly from the JSON provided).
Always respond naturally, offering relevant upsells (add-ons, larger sizes, bakery with coffee).
Always state prices in EGP and note they include VAT.
    `,
    start_speaker: "agent",
    model_temperature: 0.7,
    nodes: [
      {
        id: "start",
        type: "conversation",
        instruction: {
          type: "prompt",
          text: "👋 Welcome to our café! How can I help you today? Would you like to see our drinks, bakery, or full menu?"
        },
        edges: [
          {
            id: "ask_menu",
            transition_condition: { type: "prompt", prompt: "User asks for menu or specific category" },
            destination_node_id: "menu_lookup"
          },
          {
            id: "direct_order",
            transition_condition: { type: "prompt", prompt: "User starts ordering directly" },
            destination_node_id: "order_details"
          }
        ]
      },
     {
        id: "menu_lookup",
        type: "function",
        instruction: {
          type: "custom_function",
          name: "lookupMenu",
          parameters: {
            query: "{{user_input}}"
          }
        },
        edges: [
          {
            id: "menu_to_order",
            transition_condition: {
              type: "always"
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
          text: "Got it! What size would you like? We have Small, Medium, and Large, each with its own price."
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
          text: "Would you like to add any extras? For example: extra espresso, flavor shots, whipped cream, or plant-based milk."
        },
        edges: [
          {
            id: "confirm_order",
            transition_condition: {
              type: "always"
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
        instruction: {
          type: "custom_function",
          name: "submitOrder",
          parameters: {
            order: "{{order_data}}"
          }
        },
        edges: [
          {
            id: "done",
            transition_condition: { type: "always" },
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

  try {
    const result = await client.conversationFlow.create(flow);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Error creating flow:", err);
    return NextResponse.json({ error: "Failed to create flow" }, { status: 500 });
  }
}
