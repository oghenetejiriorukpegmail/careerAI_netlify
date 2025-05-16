"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type JobApplication = {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  created_at: string;
};

type JobMatch = {
  id: string;
  company_name: string;
  job_title: string;
  location: string;
  job_url: string;
  matched_at: string;
};

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<JobApplication[]>([]);
  const [jobMatches, setJobMatches] = useState<JobMatch[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          // Fetch profile data
          const { data: profileData } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", userData.user.id)
            .single();
          
          setProfile(profileData);
          
          // Fetch job applications
          const { data: applicationsData } = await supabase
            .from("job_applications")
            .select(`
              id,
              status,
              created_at,
              job_description_id,
              job_descriptions (
                company_name,
                job_title
              )
            `)
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false })
            .limit(5);
            
          if (applicationsData) {
            setApplications(applicationsData.map((app: any) => ({
              id: app.id,
              company_name: app.job_descriptions?.company_name || "Unknown Company",
              job_title: app.job_descriptions?.job_title || "Unknown Position",
              status: app.status,
              created_at: app.created_at
            })));
          }

          // Fetch job matches
          const { data: matchesData } = await supabase
            .from("job_matches")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("matched_at", { ascending: false })
            .limit(5);
            
          if (matchesData) {
            setJobMatches(matchesData);
          }
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome back, {profile?.full_name || "User"}!
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Link href="/dashboard/resume/new" passHref>
            <Button>Create New Resume</Button>
          </Link>
          <Link href="/dashboard/job-matching" passHref>
            <Button variant="outline">Find Jobs</Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Resume</CardTitle>
            <CardDescription>Upload and manage your resumes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">resumes created</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/resume" className="w-full">
              <Button variant="outline" className="w-full">View Resumes</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Job Matches</CardTitle>
            <CardDescription>Jobs matching your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{jobMatches.length}</div>
            <p className="text-xs text-muted-foreground">new job matches</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/job-matching" className="w-full">
              <Button variant="outline" className="w-full">View Job Matches</Button>
            </Link>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Applications</CardTitle>
            <CardDescription>Track your job applications</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{applications.length}</div>
            <p className="text-xs text-muted-foreground">active applications</p>
          </CardContent>
          <CardFooter>
            <Link href="/dashboard/applications" className="w-full">
              <Button variant="outline" className="w-full">View Applications</Button>
            </Link>
          </CardFooter>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Applications</CardTitle>
            <CardDescription>Track your recent job applications</CardDescription>
          </CardHeader>
          <CardContent>
            {applications.length > 0 ? (
              <div className="space-y-4">
                {applications.map((application) => (
                  <div key={application.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{application.job_title}</p>
                      <p className="text-sm text-muted-foreground">{application.company_name}</p>
                    </div>
                    <div>
                      <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-secondary">
                        {application.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-4">No applications yet</p>
                <Link href="/dashboard/job-matching" passHref>
                  <Button variant="outline" size="sm">
                    Find Jobs to Apply
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          {applications.length > 0 && (
            <CardFooter>
              <Link href="/dashboard/applications" className="w-full">
                <Button variant="outline" className="w-full">View All Applications</Button>
              </Link>
            </CardFooter>
          )}
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Job Matches</CardTitle>
            <CardDescription>Jobs that match your profile</CardDescription>
          </CardHeader>
          <CardContent>
            {jobMatches.length > 0 ? (
              <div className="space-y-4">
                {jobMatches.map((match) => (
                  <div key={match.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{match.job_title}</p>
                      <p className="text-sm text-muted-foreground">{match.company_name} • {match.location}</p>
                    </div>
                    <a href={match.job_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">View</Button>
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center">
                <p className="text-muted-foreground mb-4">No job matches yet</p>
                <Link href="/dashboard/profile" passHref>
                  <Button variant="outline" size="sm">
                    Complete Your Profile
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
          {jobMatches.length > 0 && (
            <CardFooter>
              <Link href="/dashboard/job-matching" className="w-full">
                <Button variant="outline" className="w-full">View All Matches</Button>
              </Link>
            </CardFooter>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks to enhance your job search</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Link href="/dashboard/resume/new" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Create Resume</span>
                <span className="text-xs text-muted-foreground">Generate ATS-optimized resume</span>
              </Button>
            </Link>
            <Link href="/dashboard/job-matching" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Find Jobs</span>
                <span className="text-xs text-muted-foreground">Discover relevant opportunities</span>
              </Button>
            </Link>
            <Link href="/dashboard/profile/linkedin" passHref>
              <Button variant="outline" className="w-full h-24 flex flex-col">
                <span className="text-lg">Optimize LinkedIn</span>
                <span className="text-xs text-muted-foreground">Improve your LinkedIn profile</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}