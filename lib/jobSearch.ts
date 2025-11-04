// Fast parallel job search implementation
// Searches multiple sources simultaneously for speed

interface JobSearchQuery {
  keywords: string[];
  locations: string[];
  remote: string;
  internshipTypes: string[];
  salaryMin?: number;
  salaryMax?: number;
  limit: number;
}

interface JobResult {
  title: string;
  company: string;
  location: string;
  url: string;
  salary?: { min?: number; max?: number };
  remote: boolean;
  internshipType?: string;
  description?: string;
  source: string;
}

// Main search function - searches all sources in parallel
export async function searchAllSources(query: JobSearchQuery): Promise<JobResult[]> {
  const searchPromises = [
    searchLinkedIn(query),
    searchIndeed(query),
    searchHandshake(query),
    searchInternshipBoards(query),
  ];

  // Execute all searches in parallel for maximum speed
  const results = await Promise.allSettled(searchPromises);

  // Combine results from all sources
  const allJobs: JobResult[] = [];
  const sourceNames = ["LinkedIn/JSearch", "Indeed/Adzuna", "RemoteOK", "Internship Boards"];
  results.forEach((result, index) => {
    if (result.status === "fulfilled" && result.value) {
      const jobCount = result.value.length;
      console.log(`[searchAllSources] ${sourceNames[index]}: Found ${jobCount} jobs`);
      allJobs.push(...result.value);
    } else if (result.status === "rejected") {
      console.warn(`[searchAllSources] ${sourceNames[index]} failed:`, result.reason);
    } else {
      console.log(`[searchAllSources] ${sourceNames[index]}: 0 jobs`);
    }
  });
  
  console.log(`[searchAllSources] Total jobs from all sources: ${allJobs.length}`);

  // Remove duplicates by URL
  const uniqueJobs = removeDuplicates(allJobs);

  // Filter by preferences and return top matches
  return filterAndSort(uniqueJobs, query).slice(0, query.limit);
}

// LinkedIn Job Search - Using JSearch API (RapidAPI) - FREE tier available
// Optional: Requires API key. Falls back to other sources if not available.
async function searchLinkedIn(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    // JSearch API via RapidAPI - FREE tier: 250 requests/month
    // Fast and reliable, aggregates LinkedIn, Indeed, Glassdoor
    const apiKey = process.env.JSEARCH_API_KEY || process.env.RAPIDAPI_KEY;
    
    if (!apiKey) {
      // JSearch is optional - other APIs will provide real data
      // To enable: Sign up at https://rapidapi.com/letscrape-6bRBa3QguO5/api/jsearch
      // and add JSEARCH_API_KEY to .env.local
      return [];
    }

    const keywords = query.keywords.join(" ");
    const location = query.locations[0] || "United States";
    
    const response = await fetch(
      `https://jsearch.p.rapidapi.com/search?query=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}&page=1&num_pages=3`,
      {
        headers: {
          "X-RapidAPI-Key": apiKey,
          "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
        },
      }
    );

    if (!response.ok) {
      console.warn("[searchLinkedIn] API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.data || []).map((job: any) => ({
      title: job.job_title || "",
      company: job.employer_name || "",
      location: job.job_city + ", " + job.job_state || job.job_country || "",
      url: job.job_apply_link || job.job_google_link || "",
      salary: job.job_min_salary
        ? { min: job.job_min_salary, max: job.job_max_salary }
        : undefined,
      remote: job.job_is_remote || false,
      internshipType: "summer", // Default
      description: job.job_description || "",
      source: "jsearch_linkedin",
    }));
  } catch (error) {
    console.warn("[searchLinkedIn] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

// Indeed Job Search - Using Adzuna API (FREE, no auth needed)
async function searchIndeed(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    // Adzuna API - FREE, searches Indeed, CareerBuilder, Monster and more
    // No authentication required for basic usage
    const keywords = query.keywords.join(" ");
    const location = query.locations[0] || "us";
    
    // Try Adzuna - they have a free tier
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${location}/search/1?app_id=${process.env.ADZUNA_APP_ID || 'demo'}&app_key=${process.env.ADZUNA_APP_KEY || 'demo'}&results_per_page=25&what=${encodeURIComponent(keywords)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      // If Adzuna fails, try Jobs API (free alternative)
      return await searchJobsAPI(query);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return await searchJobsAPI(query);
    }

    const data = await response.json();
    
    return (data.results || []).map((job: any) => ({
      title: job.title || "",
      company: job.company?.display_name || "",
      location: job.location?.display_name || "",
      url: job.redirect_url || "",
      salary: job.salary_min
        ? { min: job.salary_min, max: job.salary_max }
        : undefined,
      remote: job.work_from_home || false,
      internshipType: "summer",
      description: job.description || "",
      source: "adzuna",
    }));
  } catch (error) {
    console.warn("[searchIndeed] Error, trying fallback:", error instanceof Error ? error.message : "Unknown error");
    return await searchJobsAPI(query);
  }
}

// Fallback: Jobs API - FREE, no auth
async function searchJobsAPI(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const keywords = query.keywords.join(" ");
    const location = query.locations[0] || "United States";
    
    // Jobs API - completely free, no auth
    const response = await fetch(
      `https://jobs.github.com/positions.json?description=${encodeURIComponent(keywords)}&location=${encodeURIComponent(location)}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) return [];

    const data = await response.json();
    
    return (data || []).map((job: any) => ({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      url: job.url || job.how_to_apply || "",
      remote: job.type?.toLowerCase().includes("remote") || false,
      internshipType: "summer",
      description: job.description || "",
      source: "github_jobs",
    }));
  } catch (error) {
    return [];
  }
}

// Remote Jobs - Using RemoteOK API (FREE, real jobs)
async function searchHandshake(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    // RemoteOK API - FREE, no auth, real remote jobs
    const keywords = query.keywords.join(" ").toLowerCase();
    
    const response = await fetch(
      `https://remoteok.com/api?tags=${encodeURIComponent(keywords)}`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) {
      return await searchRemoteCo(query);
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return await searchRemoteCo(query);
    }

    const data = await response.json();
    
    // RemoteOK returns array with first item as metadata
    const jobs = Array.isArray(data) && data.length > 0 && typeof data[0] === 'object' 
      ? data.filter((item: any) => item && typeof item === 'object' && item.id && item.company) 
      : [];
    
    return jobs.map((job: any) => ({
      title: job.position || job.title || "",
      company: job.company || "",
      location: "Remote",
      url: job.url || `https://remoteok.com/remote-jobs/${job.id}` || "",
      remote: true,
      internshipType: "summer",
      description: job.description || "",
      source: "remoteok",
    })).filter((job: JobResult) => job.title && job.company && job.url);
  } catch (error) {
    console.warn("[searchHandshake] Error, trying fallback:", error instanceof Error ? error.message : "Unknown error");
    return await searchRemoteCo(query);
  }
}

// Fallback: Remote.co API
async function searchRemoteCo(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const keywords = query.keywords.join(" ");
    
    // Remote.co doesn't have a direct API, but we can use their RSS or scrape
    // For now, return empty - in production you might want to add web scraping
    return [];
  } catch (error) {
    return [];
  }
}

// Other internship-specific boards
async function searchInternshipBoards(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const results: JobResult[] = [];
    
    // Search multiple FREE APIs in parallel for maximum coverage
    const boardSearches = [
      searchArbeitnow(query), // FREE - Europe & remote jobs
      searchGraphQLJobs(query), // FREE - GraphQL Jobs API
    ];

    const boardResults = await Promise.allSettled(boardSearches);
    boardResults.forEach((result) => {
      if (result.status === "fulfilled" && result.value) {
        results.push(...result.value);
      }
    });

    return results;
  } catch (error) {
    console.warn("[searchInternshipBoards] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

// Arbeitnow API - FREE, no auth needed, Europe + remote (real jobs)
async function searchArbeitnow(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const keywords = query.keywords.join(" ");
    
    const response = await fetch(
      `https://www.arbeitnow.com/api/job-board-api?keywords=${encodeURIComponent(keywords)}&limit=25`,
      {
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0",
        },
      }
    );

    if (!response.ok) return [];

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      return [];
    }

    const data = await response.json();
    
    // Arbeitnow returns real job data
    return (data.data || []).map((job: any) => ({
      title: job.title || "",
      company: job.company_name || "",
      location: job.location || "Remote",
      url: job.url || "",
      remote: job.remote || false,
      internshipType: "summer",
      description: job.description || "",
      source: "arbeitnow",
    })).filter((job: JobResult) => job.title && job.company && job.url);
  } catch (error) {
    return [];
  }
}

// GraphQL Jobs API - FREE, no auth
async function searchGraphQLJobs(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const keywords = query.keywords.join(" ");
    
    // GraphQL endpoint
    const response = await fetch("https://api.graphql.jobs/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `
          query {
            jobs(input: {
              location: "${query.locations[0] || ""}"
              slug: "${keywords.toLowerCase()}"
            }) {
              id
              title
              company {
                name
              }
              locationNames
              remotes {
                name
              }
              applyUrl
              description
            }
          }
        `,
      }),
    });

    if (!response.ok) return [];

    const data = await response.json();
    
    return (data.data?.jobs || []).map((job: any) => ({
      title: job.title || "",
      company: job.company?.name || "",
      location: job.locationNames?.[0] || "Remote",
      url: job.applyUrl || "",
      remote: job.remotes?.length > 0 || false,
      internshipType: "summer",
      description: job.description || "",
      source: "graphql_jobs",
    }));
  } catch (error) {
    return [];
  }
}

// Utility functions
function removeDuplicates(jobs: JobResult[]): JobResult[] {
  const seen = new Set<string>();
  return jobs.filter((job) => {
    if (seen.has(job.url)) {
      return false;
    }
    seen.add(job.url);
    return true;
  });
}

function filterAndSort(jobs: JobResult[], query: JobSearchQuery): JobResult[] {
  return jobs
    .filter((job) => {
      // Quick keyword match
      if (query.keywords.length > 0) {
        const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
        const hasKeyword = query.keywords.some((keyword) =>
          jobText.includes(keyword.toLowerCase())
        );
        if (!hasKeyword) return false;
      }

      // Remote filter
      if (query.remote && query.remote !== "any") {
        if (query.remote === "remote" && !job.remote) return false;
        if (query.remote === "onsite" && job.remote) return false;
      }

      // Salary filter
      if (query.salaryMin && job.salary?.max && job.salary.max < query.salaryMin)
        return false;
      if (query.salaryMax && job.salary?.min && job.salary.min > query.salaryMax)
        return false;

      return true;
    })
    .sort((a, b) => {
      // Sort by relevance (could add scoring algorithm)
      return 0;
    });
}

