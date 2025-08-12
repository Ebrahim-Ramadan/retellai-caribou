import { type NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.RETELL_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate and merge with defaults
    const payload = {
      global_prompt: body.global_prompt ?? "You are a friendly, bilingual Caribou Coffee assistant.",
      tools: body.tools ?? [],
      start_node_id: body.start_node_id ?? "start",
      model_temperature: body.model_temperature ?? 0.7,
      tool_call_strict_mode: body.tool_call_strict_mode ?? true,
      default_dynamic_variables: body.default_dynamic_variables ?? {},
      knowledge_base_ids: body.knowledge_base_ids ?? [],
      begin_tag_display_position: body.begin_tag_display_position ?? { x: 100, y: 200 },
      mcps: body.mcps ?? [],
      start_speaker: body.start_speaker ?? "agent",
      model_choice: body.model_choice ?? { type: "cascading", model: "gpt-4o", high_priority: true },
      nodes: body.nodes ?? [],
    };

    // Validate and transform nodes
    payload.nodes = payload.nodes.map((node: any) => {
      if (node.type === "function") {
        return {
          ...node,
          tool_id: node.tool_id ?? node.instruction?.name ?? "default_tool",
          tool_type: node.tool_type === "custom_function" ? "local" : node.tool_type ?? "local",
          wait_for_result: node.wait_for_result ?? true,
          instruction: {
            type: "prompt",
            text: node.instruction?.text ?? "Executing function",
          },
          edges: (node.edges ?? []).map((edge: any) => ({
            ...edge,
            transition_condition: edge.transition_condition?.type === "equation"
              ? {
                  ...edge.transition_condition,
                  equations: edge.transition_condition.equations.map((eq: any) => ({
                    left: eq.variable ?? "result",
                    operator: "==",
                    right: eq.value ?? "success",
                  })),
                  operator: edge.transition_condition.operator ?? "&&",
                }
              : {
                  type: "prompt",
                  prompt: edge.transition_condition?.prompt ?? "Default transition",
                },
          })),
        };
      }
      return node;
    });

    const response = await fetch("https://api.retellai.com/create-conversation-flow", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.error_message || errorData.error || "Failed to create flow", status: response.status },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create flow",
        details: "Internal server error",
      },
      { status: 500 }
    );
  }
}