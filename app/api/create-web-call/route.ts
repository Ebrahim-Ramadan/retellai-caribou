import { type NextRequest, NextResponse } from "next/server"

const API_KEY = process.env.RETELL_API_KEY
console.log('API_KEY', API_KEY);

export async function POST(request: NextRequest) {
  try {
    const { agent_id, metadata, retell_llm_dynamic_variables } = await request.json()

    // Prepare the payload for the API request
    const payload: any = { agent_id }

    // Conditionally add optional fields if they are provided
    if (metadata) {
      payload.metadata = metadata
    }

    if (retell_llm_dynamic_variables) {
      payload.retell_llm_dynamic_variables = retell_llm_dynamic_variables
    }

    const response = await fetch("https://api.retellai.com/v2/create-web-call", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      let errorMessage = "Failed to create web call"
      try {
        const errorData = await response.json()
        errorMessage = errorData.message || errorData.error || errorMessage
      } catch {
        // If response is not JSON, use status text
        errorMessage = response.statusText || errorMessage
      }

      console.error("Error creating web call:", errorMessage)
      return NextResponse.json(
        {
          error: errorMessage,
          status: response.status,
        },
        { status: response.status },
      )
    }

    const data = await response.json()
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error creating web call:", error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create web call",
        details: "Internal server error",
      },
      { status: 500 },
    )
  }
}
