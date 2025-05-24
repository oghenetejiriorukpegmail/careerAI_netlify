import axios from 'axios';

// Types for job data
export interface JobListing {
  id: string;
  job_title: string;
  company_name: string;
  location: string;
  job_url: string;
  description: string;
  source: 'linkedin' | 'indeed' | 'dice';
  posted_date?: string;
  salary_range?: string;
}

// Types for LinkedIn profile data
export interface LinkedInProfile {
  profile_url: string;
  full_name?: string;
  headline?: string;
  summary?: string;
  experience?: LinkedInExperience[];
  education?: LinkedInEducation[];
  skills?: string[];
  certifications?: string[];
  recommendations?: number;
  connections?: string;
  profile_image_url?: string;
}

interface LinkedInExperience {
  title: string;
  company: string;
  location?: string;
  date_range?: string;
  description?: string;
}

interface LinkedInEducation {
  institution: string;
  degree?: string;
  field?: string;
  date_range?: string;
}

/**
 * Get Bright Data MCP configuration
 * @returns Bright Data configuration object
 */
function getBrightDataConfig() {
  const username = process.env.BRIGHT_DATA_USERNAME;
  const password = process.env.BRIGHT_DATA_PASSWORD;
  const zone = process.env.BRIGHT_DATA_ZONE || 'data_center';
  
  if (!username || !password) {
    throw new Error('Bright Data credentials not configured');
  }
  
  return {
    auth: {
      username,
      password
    },
    proxyUrl: `http://brd.superproxy.io:22225`,
    zone
  };
}

/**
 * Scrape LinkedIn profile using Bright Data MCP
 * @param profileUrl LinkedIn profile URL
 * @returns Scraped LinkedIn profile data
 */
export async function scrapeLinkedInProfile(profileUrl: string): Promise<LinkedInProfile> {
  const config = getBrightDataConfig();
  
  try {
    // Call Bright Data's collector API
    const response = await axios.post('https://api.brightdata.com/scrape', {
      collector: 'linkedin_profile_collector',
      url: profileUrl,
      config: {
        // Bright Data specific configurations
        wait_for: '.profile-section',
        country: 'us',
        browser: 'chrome'
      }
    }, {
      auth: config.auth,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Transform response data to our internal format
    const data = response.data;
    
    if (!data || !data.profile) {
      throw new Error('Failed to retrieve LinkedIn profile data');
    }
    
    return {
      profile_url: profileUrl,
      full_name: data.profile.name,
      headline: data.profile.headline,
      summary: data.profile.summary,
      experience: data.profile.experience?.map((exp: any) => ({
        title: exp.title,
        company: exp.company,
        location: exp.location,
        date_range: exp.date_range,
        description: exp.description
      })) || [],
      education: data.profile.education?.map((edu: any) => ({
        institution: edu.school,
        degree: edu.degree,
        field: edu.field_of_study,
        date_range: edu.date_range
      })) || [],
      skills: data.profile.skills || [],
      certifications: data.profile.certifications?.map((cert: any) => cert.name) || [],
      recommendations: data.profile.recommendations_count,
      connections: data.profile.connections,
      profile_image_url: data.profile.profile_image_url
    };
  } catch (error) {
    console.error('Error scraping LinkedIn profile:', error);
    throw new Error('Failed to scrape LinkedIn profile data');
  }
}

/**
 * Scrape job listings from major job boards using Bright Data MCP
 * @param keywords Keywords to search for
 * @param location Location to search in (optional)
 * @param sources Job boards to search (defaults to all)
 * @returns Array of job listings
 */
export async function scrapeJobListings(
  keywords: string[],
  location?: string,
  sources: Array<'linkedin' | 'indeed' | 'dice'> = ['linkedin', 'indeed', 'dice']
): Promise<JobListing[]> {
  const config = getBrightDataConfig();
  const results: JobListing[] = [];
  
  try {
    // Run scraping for each source in parallel
    const promises = sources.map(async (source) => {
      let collectorName;
      switch(source) {
        case 'linkedin':
          collectorName = 'linkedin_jobs_collector';
          break;
        case 'indeed':
          collectorName = 'indeed_jobs_collector';
          break;
        case 'dice':
          collectorName = 'dice_jobs_collector';
          break;
      }
      
      // Call Bright Data's collector API
      const response = await axios.post('https://api.brightdata.com/scrape', {
        collector: collectorName,
        search_query: keywords.join(' '),
        location: location || '',
        config: {
          // Bright Data specific configurations
          country: 'us',
          browser: 'chrome',
          max_results: 50
        }
      }, {
        auth: config.auth,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      // Transform response data to our internal format
      if (response.data && Array.isArray(response.data.results)) {
        return response.data.results.map((job: any) => ({
          id: job.id || `${source}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          job_title: job.title || job.job_title,
          company_name: job.company || job.company_name,
          location: job.location,
          job_url: job.url || job.job_url,
          description: job.description || '',
          source: source,
          posted_date: job.posted_date || job.date,
          salary_range: job.salary || job.salary_range
        }));
      }
      
      return [];
    });
    
    // Combine results from all sources
    const allResults = await Promise.all(promises);
    return allResults.flat();
  } catch (error) {
    console.error('Error scraping job listings:', error);
    throw new Error('Failed to scrape job listings');
  }
}

/**
 * Scrape a job description from a URL using Bright Data MCP
 * @param jobUrl URL to the job posting
 * @returns Job description text
 */
export async function scrapeJobDescription(jobUrl: string): Promise<string> {
  const config = getBrightDataConfig();
  
  try {
    // Call Bright Data's collector API
    const response = await axios.post('https://api.brightdata.com/scrape', {
      collector: 'job_description_collector',
      url: jobUrl,
      config: {
        // Bright Data specific configurations
        wait_for: '.job-description',
        country: 'us',
        browser: 'chrome'
      }
    }, {
      auth: config.auth,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.data || !response.data.description) {
      throw new Error('Failed to retrieve job description');
    }
    
    return response.data.description;
  } catch (error) {
    console.error('Error scraping job description:', error);
    throw new Error('Failed to scrape job description');
  }
}