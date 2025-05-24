"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader } from "lucide-react";

export default function NewJobDescriptionPage() {
  const [jobTitle, setJobTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [jobUrl, setJobUrl] = useState("");
  const [activeTab, setActiveTab] = useState("paste");
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  const validateForm = () => {
    if (activeTab === "paste" && !description) {
      setError("Please enter the job description");
      return false;
    }
    
    if (activeTab === "url" && !jobUrl) {
      setError("Please enter a job listing URL");
      return false;
    }
    
    if (activeTab === "manual") {
      if (!jobTitle || !companyName || !description) {
        setError("Please fill in all required fields for manual entry");
        return false;
      }
    }
    
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setLoading(true);
      setAnalyzing(true);
      setError(null);
      
      // Get current user - support both authenticated and session users
      let userId: string;
      try {
        const { data: userData, error: userError } = await supabase.auth.getUser();
        if (userData.user) {
          userId = userData.user.id;
        } else {
          // Use session-based user ID for non-authenticated users
          const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem('sessionUserId', sessionUserId);
          userId = sessionUserId;
        }
      } catch {
        // Fallback to session user
        const sessionUserId = localStorage.getItem('sessionUserId') || `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        localStorage.setItem('sessionUserId', sessionUserId);
        userId = sessionUserId;
      }

      // Prepare data for the parsing API
      const requestData: any = {
        userId,
        inputMethod: activeTab === 'url' ? 'url' : activeTab === 'manual' ? 'manual' : 'text_paste'
      };

      if (activeTab === 'paste') {
        // Use the pasted job description
        requestData.jobText = description;
      } else if (activeTab === 'url') {
        // Process URL
        requestData.url = jobUrl;
        requestData.jobText = ''; // Will be populated by URL scraping
      } else if (activeTab === 'manual') {
        // Use manual entry - create a structured job description from form fields
        const manualJobText = `Job Title: ${jobTitle}
Company: ${companyName}
Location: ${location}

Job Description:
${description}`;
        requestData.jobText = manualJobText;
      }

      console.log('Sending job description for processing:', {
        inputMethod: requestData.inputMethod,
        contentLength: requestData.jobText?.length || 0,
        hasUrl: !!requestData.url
      });

      // Call the job parsing API
      const response = await fetch('/api/job-descriptions/parse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Job processing error:", errorData);
        throw new Error(errorData.error || "Failed to process job description");
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || "Job processing failed");
      }

      console.log("Job description processed successfully:", {
        jobId: result.jobId,
        inputMethod: result.inputMethod,
        parseSuccess: result.processingInfo?.parseSuccess
      });

      setAnalyzing(false);
      setLoading(false);

      toast({
        title: "Success",
        description: `Job description ${result.inputMethod === 'url' ? 'scraped and' : ''} analyzed successfully`,
      });

      // Redirect to job opportunities list or dashboard
      router.push("/dashboard/job-opportunities");
      
    } catch (error: any) {
      setLoading(false);
      setAnalyzing(false);
      setError(error.message || "Failed to process job description");
      console.error("Job processing error:", error);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Add Job Description</h1>
        <p className="text-muted-foreground">
          Enter a job description to create a tailored resume and cover letter
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Job Details</CardTitle>
            <CardDescription>
              Enter the job details or provide a URL to the job listing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm">
                {error}
              </div>
            )}

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="paste">Paste Text</TabsTrigger>
                <TabsTrigger value="url">From URL</TabsTrigger>
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
              </TabsList>
              <TabsContent value="paste" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Job Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Paste the full job description here..."
                    rows={8}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="url" className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label htmlFor="jobUrl">Job Listing URL</Label>
                  <Input
                    id="jobUrl"
                    placeholder="https://example.com/job-listing"
                    value={jobUrl}
                    onChange={(e) => setJobUrl(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    We'll automatically extract the job details from the provided URL
                  </p>
                </div>
              </TabsContent>
              <TabsContent value="manual" className="space-y-4 pt-4">
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="manualJobTitle">Job Title *</Label>
                      <Input
                        id="manualJobTitle"
                        placeholder="e.g. Senior Software Engineer"
                        value={jobTitle}
                        onChange={(e) => setJobTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualCompanyName">Company Name *</Label>
                      <Input
                        id="manualCompanyName"
                        placeholder="e.g. Tech Corp Inc."
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualLocation">Location</Label>
                    <Input
                      id="manualLocation"
                      placeholder="e.g. New York, NY or Remote"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualDescription">Job Description *</Label>
                    <Textarea
                      id="manualDescription"
                      placeholder="Enter the full job description, requirements, and responsibilities..."
                      rows={8}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    * Required fields. The AI will analyze your input to extract requirements and keywords.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            {(activeTab === 'paste' || activeTab === 'url') && (
              <>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title (Optional)</Label>
                    <Input
                      id="jobTitle"
                      placeholder="e.g. Software Engineer"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name (Optional)</Label>
                    <Input
                      id="companyName"
                      placeholder="e.g. Acme Inc."
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location (Optional)</Label>
                  <Input
                    id="location"
                    placeholder="e.g. New York, NY or Remote"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            <div className="mt-6 space-y-4">
              <h3 className="text-md font-medium">What happens next?</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center bg-primary text-primary-foreground">
                    <span className="text-xs">1</span>
                  </div>
                  <span>Add job description</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center ${analyzing ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    {analyzing ? (
                      <Loader className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <span className="text-xs">2</span>
                    )}
                  </div>
                  <span>AI analyzes job requirements and keywords</span>
                </li>
                <li className="flex items-center space-x-2">
                  <div className="h-6 w-6 rounded-full flex items-center justify-center bg-muted">
                    <span className="text-xs">3</span>
                  </div>
                  <span>Create a tailored resume and cover letter</span>
                </li>
              </ul>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/dashboard")}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || analyzing}
            >
              {loading || analyzing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  {loading ? "Saving..." : "Analyzing..."}
                </>
              ) : (
                "Continue"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}