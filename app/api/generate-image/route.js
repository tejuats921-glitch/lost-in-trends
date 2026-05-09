import OpenAI from "openai";
import { NextResponse } from "next/server";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await openai.images.generate({
      model: "dall-e-3",
      prompt: body.prompt,
      size: "1024x1792",
      quality: "hd",
      style: "vivid",
    });

    return NextResponse.json({
      image: response.data[0].url,
    });
  } catch (error) {
    console.log(error);

    return NextResponse.json({
      error: "Image generation failed",
    });
  }
}