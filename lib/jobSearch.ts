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
  console.log(`[searchAllSources] Starting search with locations:`, query.locations);
  console.log(`[searchAllSources] Keywords:`, query.keywords);
  
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
  const sourceNames = ["LinkedIn/JSearch", "Indeed/Adzuna", "RemoteOK", "Additional Boards (USAJobs/Jooble/Careerjet)"];
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
  console.log(`[searchAllSources] After deduplication: ${uniqueJobs.length} jobs`);

  // Filter by preferences and return top matches
  const filtered = filterAndSort(uniqueJobs, query);
  console.log(`[searchAllSources] After filtering: ${filtered.length} jobs`);
  
  return filtered.slice(0, query.limit);
}

// Helper function to normalize location for API calls
function normalizeLocationForAPI(location: string): string {
  if (!location) return "United States";
  
  // Remove country name if present (e.g., "Atlanta, GA, United States" -> "Atlanta, GA")
  const parts = location.split(',').map(p => p.trim());
  if (parts.length > 2) {
    // Remove country (last part)
    return parts.slice(0, 2).join(', ');
  }
  return location;
}

// Helper function to extract country code for APIs that need it
function extractCountryCode(location: string): string {
  const locationLower = location.toLowerCase();
  if (locationLower.includes("united states") || locationLower.includes("usa") || locationLower.includes("us")) {
    return "us";
  }
  // Add more country mappings as needed
  return "us"; // Default to US
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
    const location = normalizeLocationForAPI(query.locations[0] || "United States");
    
    console.log(`[searchLinkedIn] Searching with location: "${location}"`);
    
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
    
    const jobs = (data.data || []).map((job: any) => ({
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
    
    console.log(`[searchLinkedIn] Found ${jobs.length} jobs`);
    return jobs;
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
    // Adzuna needs country code, not city name
    const countryCode = extractCountryCode(query.locations[0] || "United States");
    
    console.log(`[searchIndeed] Searching with country code: "${countryCode}" for location: "${query.locations[0]}"`);
    
    // Try Adzuna - they have a free tier
    const response = await fetch(
      `https://api.adzuna.com/v1/api/jobs/${countryCode}/search/1?app_id=${process.env.ADZUNA_APP_ID || 'demo'}&app_key=${process.env.ADZUNA_APP_KEY || 'demo'}&results_per_page=25&what=${encodeURIComponent(keywords)}&where=${encodeURIComponent(normalizeLocationForAPI(query.locations[0] || ""))}`,
      {
        headers: {
          "Accept": "application/json",
        },
      }
    );

    if (!response.ok) {
      // If Adzuna fails, return empty (no fallback - GitHub Jobs API is offline)
      console.warn(`[searchIndeed] Adzuna API error: ${response.status}`);
      return [];
    }

    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      console.warn("[searchIndeed] Response is not JSON");
      return [];
    }

    const data = await response.json();
    
    const jobs = (data.results || []).map((job: any) => ({
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
    
    console.log(`[searchIndeed] Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.warn("[searchIndeed] Error:", error instanceof Error ? error.message : "Unknown error");
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
      searchUSAJobs(query), // FREE - US Government jobs (requires API key)
      searchJooble(query), // FREE - Meta-search engine worldwide (requires API key)
      searchCareerjet(query), // FREE - Job aggregator 90+ countries (requires API key)
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

// USAJOBS API - FREE, requires API key (US Government jobs)
async function searchUSAJobs(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const apiKey = process.env.USAJOBS_API_KEY;
    const userAgent = process.env.USAJOBS_USER_AGENT || "your-email@example.com";
    
    if (!apiKey) {
      // USAJOBS is optional - requires free registration
      // Sign up at: https://developer.usajobs.gov/
      return [];
    }

    const keywords = query.keywords.join(" ");
    const location = query.locations[0] || "";
    
    // USAJOBS API - Official US government job listings
    const url = new URL("https://data.usajobs.gov/api/Search");
    url.searchParams.set("Keyword", keywords);
    if (location && !location.toLowerCase().includes("remote")) {
      url.searchParams.set("LocationName", location);
    }
    url.searchParams.set("ResultsPerPage", "25");
    
    const response = await fetch(url.toString(), {
      headers: {
        "Host": "data.usajobs.gov",
        "User-Agent": userAgent,
        "Authorization-Key": apiKey,
      },
    });

    if (!response.ok) {
      console.warn("[searchUSAJobs] API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.SearchResult?.SearchResultItems || []).map((item: any) => {
      const job = item.MatchedObjectDescriptor || {};
      return {
        title: job.PositionTitle || "",
        company: job.OrganizationName || "US Government",
        location: job.PositionLocationDisplay || "",
        url: job.PositionURI || "",
        remote: job.PositionRemuneration?.[0]?.PositionRemunerationType?.includes("Remote") || false,
        internshipType: job.PositionTitle?.toLowerCase().includes("intern") ? "summer" : undefined,
        description: job.UserArea?.Details?.MajorDuties || job.QualificationSummary || "",
        source: "usajobs",
      };
    }).filter((job: JobResult) => job.title && job.company && job.url);
  } catch (error) {
    console.warn("[searchUSAJobs] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

// Jooble API - FREE, meta-search engine worldwide
async function searchJooble(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const apiKey = process.env.JOOBLE_API_KEY;
    
    if (!apiKey) {
      // Jooble is optional - requires free registration
      // Sign up at: https://uk.jooble.org/api/about
      return [];
    }

    const keywords = query.keywords.join(" ");
    const location = normalizeLocationForAPI(query.locations[0] || "");
    
    console.log(`[searchJooble] Searching with location: "${location}"`);
    
    // Jooble API - International job aggregation
    const response = await fetch(
      `https://jooble.org/api/${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          keywords: keywords,
          location: location,
          page: 1,
          searchMode: 1, // 1 = all jobs, 2 = jobs with salary
          radius: 25,
        }),
      }
    );

    if (!response.ok) {
      console.warn("[searchJooble] API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.jobs || []).map((job: any) => ({
      title: job.title || "",
      company: job.company || "",
      location: job.location || "",
      url: job.link || "",
      salary: job.salary
        ? {
            min: job.salary.match(/\d+/)?.[0] ? parseInt(job.salary.match(/\d+/)?.[0]) : undefined,
            max: undefined,
          }
        : undefined,
      remote: job.location?.toLowerCase().includes("remote") || false,
      internshipType: job.title?.toLowerCase().includes("intern") ? "summer" : undefined,
      description: job.snippet || "",
      source: "jooble",
    })).filter((job: JobResult) => job.title && job.company && job.url);
  } catch (error) {
    console.warn("[searchJooble] Error:", error instanceof Error ? error.message : "Unknown error");
    return [];
  }
}

// Careerjet API - FREE, job aggregator covering 90+ countries
async function searchCareerjet(query: JobSearchQuery): Promise<JobResult[]> {
  try {
    const apiKey = process.env.CAREERJET_API_KEY;
    
    if (!apiKey) {
      // Careerjet is optional - requires free publisher key
      // Sign up at: https://www.careerjet.com/partners/api/
      return [];
    }

    const keywords = query.keywords.join(" ");
    const location = normalizeLocationForAPI(query.locations[0] || "United States");
    
    console.log(`[searchCareerjet] Searching with location: "${location}"`);
    
    // Careerjet API - Global job aggregator
    const url = new URL("https://public.api.careerjet.net/search");
    url.searchParams.set("locale_code", "en_US"); // Can be changed based on location
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("location", location);
    url.searchParams.set("pagesize", "25");
    url.searchParams.set("page", "1");
    url.searchParams.set("affid", apiKey);
    
    const response = await fetch(url.toString(), {
      headers: {
        "Accept": "application/json",
      },
    });

    if (!response.ok) {
      console.warn("[searchCareerjet] API error:", response.status);
      return [];
    }

    const data = await response.json();
    
    return (data.jobs || []).map((job: any) => ({
      title: job.title || "",
      company: job.company || "",
      location: job.locations || "",
      url: job.url || "",
      salary: job.salary
        ? {
            min: job.salary.match(/\d+/)?.[0] ? parseInt(job.salary.match(/\d+/)?.[0]) : undefined,
            max: undefined,
          }
        : undefined,
      remote: job.site || job.locations?.toLowerCase().includes("remote") || false,
      internshipType: job.title?.toLowerCase().includes("intern") ? "summer" : undefined,
      description: job.description || "",
      source: "careerjet",
    })).filter((job: JobResult) => job.title && job.company && job.url);
  } catch (error) {
    console.warn("[searchCareerjet] Error:", error instanceof Error ? error.message : "Unknown error");
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
  console.log(`[filterAndSort] Starting with ${jobs.length} jobs`);
  console.log(`[filterAndSort] Query locations:`, query.locations);
  console.log(`[filterAndSort] Query keywords:`, query.keywords);
  console.log(`[filterAndSort] Query remote:`, query.remote);
  
  // Log sample job locations for debugging
  if (jobs.length > 0) {
    console.log(`[filterAndSort] Sample job locations:`, jobs.slice(0, 5).map(j => ({
      location: j.location,
      remote: j.remote,
      title: j.title.substring(0, 30)
    })));
  }
  
  const filtered = jobs.filter((job) => {
    const filterReasons: string[] = [];
    let passed = true;
    
    // Quick keyword match
    if (query.keywords.length > 0) {
      const jobText = `${job.title} ${job.description || ""}`.toLowerCase();
      const hasKeyword = query.keywords.some((keyword) =>
        jobText.includes(keyword.toLowerCase())
      );
      if (!hasKeyword) {
        filterReasons.push(`Keyword mismatch: job doesn't contain any of ${query.keywords.join(', ')}`);
        passed = false;
      }
    }

    // Location filter - check if job location matches any selected location
    if (passed && query.locations && query.locations.length > 0) {
      const jobLocationLower = (job.location || "").toLowerCase().trim();
      const isRemote = job.remote || jobLocationLower.includes("remote");
      
      // Check if user selected "Remote" - if so, allow remote jobs
      const hasRemoteSelected = query.locations.some(loc => 
        loc.toLowerCase() === "remote"
      );
      
      // If only "Remote" is selected, allow all jobs (both remote and non-remote)
      const onlyRemoteSelected = query.locations.length === 1 && hasRemoteSelected;
      
      if (onlyRemoteSelected) {
        // User only selected Remote - allow all jobs
        // No filter reason needed
      } else if (isRemote && hasRemoteSelected) {
        // Remote job and user wants remote - allow it
        // No filter reason needed
      } else if (!isRemote) {
        // Non-remote job - must match one of the selected locations
        const nonRemoteLocations = query.locations.filter(loc => loc.toLowerCase() !== "remote");
        
        // If no non-remote locations selected, skip location filtering for non-remote jobs
        if (nonRemoteLocations.length === 0) {
          // Allow all non-remote jobs if only Remote was selected
          // No filter reason needed
        } else {
          let locationMatchFound = false;
          const locationMatchDetails: string[] = [];
          
          const matchesLocation = nonRemoteLocations.some(location => {
            const locationLower = location.toLowerCase().trim();
            
            // Extract city/state from GeoNames format (e.g., "San Francisco, CA, United States" -> "San Francisco, CA")
            const locationClean = locationLower.split(',').slice(0, 2).join(',').trim();
            
            // Exact match
            if (jobLocationLower === locationLower || jobLocationLower === locationClean) {
              locationMatchDetails.push(`Exact match: "${jobLocationLower}" === "${locationClean}"`);
              return true;
            }
            
            // Check if job location contains the selected location
            if (jobLocationLower.includes(locationClean)) {
              locationMatchDetails.push(`Job contains location: "${jobLocationLower}" includes "${locationClean}"`);
              return true;
            }
            
            // Check if selected location contains the job location
            if (locationClean.includes(jobLocationLower)) {
              locationMatchDetails.push(`Location contains job: "${locationClean}" includes "${jobLocationLower}"`);
              return true;
            }
            
            // Check for city, state format matching
            const jobParts = jobLocationLower.split(',').map(p => p.trim());
            const locationParts = locationClean.split(',').map(p => p.trim());
            
            // Match city name (first part) - more flexible matching
            if (jobParts.length > 0 && locationParts.length > 0) {
              const jobCity = jobParts[0].toLowerCase();
              const locationCity = locationParts[0].toLowerCase();
              
              // Exact city match
              if (jobCity === locationCity) {
                locationMatchDetails.push(`City match: "${jobCity}" === "${locationCity}"`);
                return true;
              }
              
              // Partial city match (one contains the other)
              if (jobCity.includes(locationCity) || locationCity.includes(jobCity)) {
                locationMatchDetails.push(`Partial city match: "${jobCity}" vs "${locationCity}"`);
                return true;
              }
            }
            
            // Match state/province name (second part)
            if (jobParts.length > 1 && locationParts.length > 1) {
              const jobState = jobParts[1].toLowerCase();
              const locationState = locationParts[1].toLowerCase();
              
              // Exact state match
              if (jobState === locationState) {
                locationMatchDetails.push(`State match: "${jobState}" === "${locationState}"`);
                return true;
              }
              
              // State abbreviation matching
              const stateAbbreviations: Record<string, string[]> = {
                "california": ["ca", "cal"],
                "new york": ["ny"],
                "texas": ["tx"],
                "florida": ["fl"],
                "illinois": ["il"],
                "pennsylvania": ["pa"],
                "ohio": ["oh"],
                "georgia": ["ga", "ga."],
                "north carolina": ["nc"],
                "michigan": ["mi"],
              };
              
              // Check if one is abbreviation of the other
              for (const [fullName, abbrevs] of Object.entries(stateAbbreviations)) {
                if ((jobState === fullName && abbrevs.includes(locationState)) ||
                    (locationState === fullName && abbrevs.includes(jobState))) {
                  locationMatchDetails.push(`State abbreviation match: "${jobState}" vs "${locationState}"`);
                  return true;
                }
              }
              
              // Also check if state names partially match
              if (jobState.includes(locationState) || locationState.includes(jobState)) {
                locationMatchDetails.push(`Partial state match: "${jobState}" vs "${locationState}"`);
                return true;
              }
            }
            
            return false;
          });
          
          if (!matchesLocation) {
            filterReasons.push(`Location mismatch: job location "${job.location}" doesn't match any of ${nonRemoteLocations.join(', ')}`);
            passed = false;
          } else {
            locationMatchFound = true;
            if (locationMatchDetails.length > 0) {
              filterReasons.push(`✓ Location matched: ${locationMatchDetails[0]}`);
            }
          }
        }
      } else {
        // Remote job but user didn't select remote - skip it
        filterReasons.push(`Remote job but user didn't select Remote`);
        passed = false;
      }
    }

      // Remote filter
      if (query.remote && query.remote !== "any") {
        if (query.remote === "remote" && !job.remote) {
          filterReasons.push(`Remote filter: user wants remote but job is not remote`);
          passed = false;
        }
        if (query.remote === "onsite" && job.remote) {
          filterReasons.push(`Remote filter: user wants onsite but job is remote`);
          passed = false;
        }
      }

      // Salary filter
      if (query.salaryMin && job.salary?.max && job.salary.max < query.salaryMin) {
        filterReasons.push(`Salary too low: job max ${job.salary.max} < user min ${query.salaryMin}`);
        passed = false;
      }
      if (query.salaryMax && job.salary?.min && job.salary.min > query.salaryMax) {
        filterReasons.push(`Salary too high: job min ${job.salary.min} > user max ${query.salaryMax}`);
        passed = false;
      }

      // Debug logging for filtered jobs
      if (!passed && filterReasons.length > 0) {
        console.log(`[filterAndSort] ❌ FILTERED OUT: "${job.title}" at ${job.company}`);
        console.log(`  Location: "${job.location}" (remote: ${job.remote})`);
        console.log(`  Reasons: ${filterReasons.join('; ')}`);
      }

      return passed;
    });
  
  console.log(`[filterAndSort] Filtered ${jobs.length} jobs -> ${filtered.length} jobs after location/keyword filtering`);
  
  // Log first few successful matches
  if (filtered.length > 0) {
    console.log(`[filterAndSort] ✓ Sample matches (first 3):`);
    filtered.slice(0, 3).forEach(job => {
      console.log(`  - "${job.title}" at ${job.company}, Location: "${job.location}"`);
    });
  }
  
  return filtered.sort((a, b) => {
    // Sort by relevance (could add scoring algorithm)
    return 0;
  });
}

