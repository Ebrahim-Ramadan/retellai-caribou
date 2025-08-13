import { NextRequest, NextResponse } from "next/server";

const API_TOKEN = process.env.RETELL_API_KEY; // Store token in .env file
const agent_id = process.env.RETELL_Template_AGENT_ID; // Store token in .env file
console.log('agent_id', agent_id);

export async function PATCH(request: NextRequest, { params }: { params: { agent_id: string } }) {
  // const { agent_id } = params;
  const body = await request.json();

  if (!API_TOKEN) {
    return NextResponse.json({ error: "API token is missing" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://api.retellai.com/update-agent/${agent_id}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        agent_name: body.agent_name || "ass",
         language:"ar-eg"
      }),
    });

     const data = await response.json();
    console.log('data', data);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.log('Error updating agent:', errorData);

      return NextResponse.json(
        { error: errorData.message || "Failed to update agent", status: response.status },
        { status: response.status }
      );
    }

   
    
    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to update agent",
        details: "Internal server error",
      },
      { status: 500 }
    );
  }
}