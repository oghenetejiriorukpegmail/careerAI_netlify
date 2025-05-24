"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { Loader, CheckCircle2, AlertCircle } from "lucide-react";

export default function LinkedInOptimizationPage() {
  const [profileUrl, setProfileUrl] = useState("");
  const [existingProfile, setExistingProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [optimizationTips, setOptimizationTips] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchLinkedInProfile = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          // Check if user already has a LinkedIn profile
          const { data, error } = await supabase
            .from("linkedin_profiles")
            .select("*")
            .eq("user_id", userData.user.id)
            .single();
            
          if (error && error.code !== "PGRST116") {
            throw error;
          }
          
          if (data) {
            setExistingProfile(data);
            setProfileUrl(data.profile_url);
            
            // If profile has been analyzed, show the optimization tips
            if (data.parsed_data?.optimization_tips) {
              setOptimizationTips(data.parsed_data.optimization_tips);
            }
          }
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load LinkedIn profile",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchLinkedInProfile();
  }, [toast]);

  const validateProfileUrl = (url: string) => {
    // Basic validation for LinkedIn profile URL
    const linkedInPattern = /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/;
    return linkedInPattern.test(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!profileUrl) {
      setError("Please enter your LinkedIn profile URL");
      return;
    }
    
    if (!validateProfileUrl(profileUrl)) {
      setError("Please enter a valid LinkedIn profile URL (e.g., https://linkedin.com/in/username)");
      return;
    }
    
    try {
      setError(null);
      setAnalyzing(true);
      
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error("User not found");
      
      // In a real implementation, this would use the Bright Data MCP service to scrape
      // the LinkedIn profile and then use AI to analyze it
      
      // For demo, we'll simulate the process and provide sample optimization tips
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      const sampleOptimizationTips = [
        "Add more industry-specific keywords to your headline to improve visibility in searches.",
        "Your summary section should tell a compelling story about your career journey and aspirations.",
        "Quantify achievements in your work experience entries to demonstrate impact.",
        "Add more relevant skills to your profile to increase endorsements and search visibility.",
        "Update your profile picture to a professional headshot with good lighting and a neutral background.",
        "Request recommendations from colleagues and managers to strengthen your credibility.",
        "Consider adding a custom LinkedIn URL for a more professional appearance.",
        "Engage more with industry content to increase your profile visibility.",
      ];
      
      // Save or update LinkedIn profile
      if (existingProfile) {
        await supabase
          .from("linkedin_profiles")
          .update({
            profile_url: profileUrl,
            updated_at: new Date().toISOString(),
            parsed_data: {
              ...existingProfile.parsed_data,
              optimization_tips: sampleOptimizationTips,
              last_analyzed: new Date().toISOString(),
            },
          })
          .eq("id", existingProfile.id);
      } else {
        await supabase
          .from("linkedin_profiles")
          .insert({
            user_id: userData.user.id,
            profile_url: profileUrl,
            parsed_data: {
              optimization_tips: sampleOptimizationTips,
              last_analyzed: new Date().toISOString(),
            },
          });
      }
      
      setOptimizationTips(sampleOptimizationTips);
      toast({
        title: "Analysis Complete",
        description: "Your LinkedIn profile has been analyzed successfully",
      });
      
    } catch (error: any) {
      setError(error.message || "Failed to analyze LinkedIn profile");
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading profile data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">LinkedIn Profile Optimization</h1>
        <p className="text-muted-foreground">
          Get personalized suggestions to improve your LinkedIn profile
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>LinkedIn Profile URL</CardTitle>
            <CardDescription>
              Provide your LinkedIn profile URL to get optimization recommendations
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm flex items-center">
                <AlertCircle className="h-4 w-4 mr-2" />
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="profileUrl">Your LinkedIn Profile URL</Label>
              <Input
                id="profileUrl"
                placeholder="https://linkedin.com/in/yourname"
                value={profileUrl}
                onChange={(e) => setProfileUrl(e.target.value)}
                disabled={analyzing}
              />
              <p className="text-xs text-muted-foreground">
                Example: https://linkedin.com/in/johndoe
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button
              type="submit"
              disabled={analyzing || !profileUrl}
              className="w-full"
            >
              {analyzing ? (
                <>
                  <Loader className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing Profile...
                </>
              ) : existingProfile ? (
                "Re-Analyze Profile"
              ) : (
                "Analyze Profile"
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>

      {optimizationTips.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Optimization Recommendations</CardTitle>
            <CardDescription>
              Based on our analysis of your LinkedIn profile
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {optimizationTips.map((tip, index) => (
                <li key={index} className="flex">
                  <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mr-2" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter className="flex justify-between flex-wrap gap-2">
            <p className="text-sm text-muted-foreground">
              Last analyzed: {existingProfile?.parsed_data?.last_analyzed
                ? new Date(existingProfile.parsed_data.last_analyzed).toLocaleDateString()
                : 'Just now'}
            </p>
            <a
              href={profileUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline">
                View Your LinkedIn Profile
              </Button>
            </a>
          </CardFooter>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Why Optimize Your LinkedIn Profile?</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <h3 className="font-medium">Increased Visibility</h3>
              <p className="text-sm text-muted-foreground">
                An optimized profile ranks higher in LinkedIn searches and attracts more recruiters.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Better Networking</h3>
              <p className="text-sm text-muted-foreground">
                A professional profile makes you more approachable for connections and opportunities.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">Professional Branding</h3>
              <p className="text-sm text-muted-foreground">
                Showcase your expertise and personal brand to stand out in your industry.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium">More Opportunities</h3>
              <p className="text-sm text-muted-foreground">
                Recruiters are more likely to reach out to candidates with complete, professional profiles.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}