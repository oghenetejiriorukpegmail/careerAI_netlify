import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { jobText, userId } = body;
    
    if (!jobText || !userId) {
      return NextResponse.json({
        error: 'jobText and userId are required'
      }, { status: 400 });
    }

    // Simple test response
    const testParsedData = {
      job_title: "Test Job Title",
      company_name: "Test Company",
      location: "Remote",
      job_summary: jobText.substring(0, 200) + "...",
      responsibilities: ["Test responsibility 1", "Test responsibility 2"],
      required_skills: ["Skill 1", "Skill 2"],
      test: true,
      message: "This is a test parsing response"
    };

    return NextResponse.json({
      success: true,
      parsedData: testParsedData,
      inputLength: jobText.length
    });

  } catch (error) {
    console.error('Test parse error:', error);
    return NextResponse.json({
      error: 'Test parse failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}