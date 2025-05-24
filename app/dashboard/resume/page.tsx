"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";

type Resume = {
  id: string;
  file_name: string;
  file_type: string;
  created_at: string;
  parsed_data: any;
};

export default function ResumesPage() {
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const fetchResumes = async () => {
      try {
        const { data: userData } = await supabase.auth.getUser();
        
        if (userData && userData.user) {
          const { data, error } = await supabase
            .from("resumes")
            .select("*")
            .eq("user_id", userData.user.id)
            .order("created_at", { ascending: false });
            
          if (error) {
            throw error;
          }
          
          setResumes(data || []);
        }
      } catch (error: any) {
        toast({
          title: "Error",
          description: error.message || "Failed to load resumes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchResumes();
  }, [toast]);

  const deleteResume = async (id: string) => {
    try {
      const { error } = await supabase
        .from("resumes")
        .delete()
        .eq("id", id);
        
      if (error) {
        throw error;
      }
      
      setResumes(resumes.filter(resume => resume.id !== id));
      
      toast({
        title: "Success",
        description: "Resume deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete resume",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[500px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading resumes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Resumes</h1>
          <p className="text-muted-foreground">
            Upload and manage your resumes to create tailored applications
          </p>
        </div>
        <Link href="/dashboard/resume/new" passHref>
          <Button>Upload New Resume</Button>
        </Link>
      </div>

      {resumes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-60 text-center p-6">
            <h3 className="text-xl font-semibold mb-2">No Resumes Yet</h3>
            <p className="text-muted-foreground mb-6">
              Upload your resume to get started with creating tailored job applications
            </p>
            <Link href="/dashboard/resume/new" passHref>
              <Button>Upload Your Resume</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardHeader>
                <CardTitle className="text-xl">{resume.file_name}</CardTitle>
                <CardDescription>
                  Uploaded on {new Date(resume.created_at).toLocaleDateString()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium">File Type:</span>
                    <span className="text-sm ml-2">{resume.file_type}</span>
                  </div>
                  {resume.parsed_data && (
                    <div>
                      <span className="text-sm font-medium">Parsing Status:</span>
                      <span className="text-sm ml-2 text-green-600">Analyzed</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteResume(resume.id)}
                >
                  Delete
                </Button>
                <Link href={`/dashboard/resume/${resume.id}`} passHref>
                  <Button size="sm">View & Edit</Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}