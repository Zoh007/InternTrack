import { NextResponse } from "next/server";

interface GeoNamesResult {
  geonameId: number;
  name: string;
  countryName: string;
  countryCode?: string;
  adminName1?: string; // State/Province
  fcodeName?: string; // Feature code name
  population?: number;
  lat?: string;
  lng?: string;
}

interface LocationSuggestion {
  label: string;
  value: string;
  type: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ suggestions: [] });
    }

    const geonamesUsername = process.env.GEONAMES_USERNAME;
    
    if (!geonamesUsername) {
      console.error("[locations/search] GEONAMES_USERNAME not configured");
      return NextResponse.json(
        { error: "Location search not configured. Please add GEONAMES_USERNAME to your .env.local file." },
        { status: 500 }
      );
    }

    console.log("[locations/search] Using GeoNames username:", geonamesUsername);

    // GeoNames search API endpoint - Global search for all locations worldwide
    // Using searchJSON with name_startsWith for autocomplete-like behavior
    // FeatureClass P = populated places (cities, towns, villages)
    // Increase maxRows to get more results, sorted by population globally
    const geonamesUrl = `http://api.geonames.org/searchJSON?name_startsWith=${encodeURIComponent(query)}&maxRows=20&featureClass=P&orderby=population&username=${geonamesUsername}`;

    let response: Response;
    try {
      response = await fetch(geonamesUrl);
    } catch (fetchError) {
      console.error("[locations/search] Fetch error:", fetchError);
      return NextResponse.json(
        { error: "Network error connecting to GeoNames API. Please check your internet connection." },
        { status: 500 }
      );
    }

    // Read response text first (before parsing JSON)
    // GeoNames may return 200 with error in JSON, or sometimes non-200 status codes
    const responseText = await response.text();
    
    // Parse JSON response (regardless of status code, as GeoNames may return errors in JSON)
    let data: any;
    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("[locations/search] JSON parse error:", jsonError);
      console.error("[locations/search] Response status:", response.status);
      console.error("[locations/search] Response text:", responseText.substring(0, 500));
      
      // If not JSON and not OK, return HTTP error
      if (!response.ok) {
        return NextResponse.json(
          { error: `GeoNames API HTTP error: ${response.status}. Please verify your GeoNames username and enable web services.` },
          { status: 400 }
        );
      }
      
      return NextResponse.json(
        { error: "Invalid response from GeoNames API" },
        { status: 500 }
      );
    }
    
    // Check for GeoNames API errors in response body first
    // GeoNames returns errors in JSON even with 200 status
    if (data.status && data.status.value) {
      const errorMsg = data.status.message || "Unknown GeoNames error";
      const errorValue = data.status.value;
      console.error("[locations/search] GeoNames API error:", data.status);
      
      let userMessage = errorMsg;
      if (errorValue === 10 || errorMsg.includes("user does not exist")) {
        userMessage = "GeoNames username does not exist. Please check your username in .env.local matches your GeoNames account.";
      } else if (errorValue === 18 || errorMsg.includes("web service")) {
        userMessage = "GeoNames web services are not enabled. Please enable 'Free Web Services' in your GeoNames account settings.";
      }
      
      return NextResponse.json({ error: userMessage }, { status: 400 });
    }
    
    // Also handle HTTP errors after parsing JSON
    if (!response.ok) {
      console.error("[locations/search] GeoNames HTTP error:", response.status, responseText);
      return NextResponse.json(
        { error: `GeoNames API HTTP error: ${response.status}. Please verify your GeoNames username and enable web services.` },
        { status: 400 }
      );
    }

    // Debug logging
    console.log("[locations/search] GeoNames response:", {
      hasGeonames: !!data.geonames,
      geonamesLength: data.geonames?.length || 0,
      totalResults: data.totalResultsCount || 0,
      hasStatus: !!data.status
    });

    if (!data.geonames || !Array.isArray(data.geonames)) {
      console.log("[locations/search] No geonames array found, returning empty suggestions");
      return NextResponse.json({ suggestions: [] });
    }

    // Format results for autocomplete
    const suggestions: LocationSuggestion[] = data.geonames
      .map((result: GeoNamesResult) => {
        // Format location string
        let locationValue = result.name;
        let locationLabel = result.name;

        // Add state/province if available
        if (result.adminName1 && result.adminName1 !== result.name) {
          locationValue = `${result.name}, ${result.adminName1}`;
          locationLabel = `${result.name}, ${result.adminName1}`;
        }

        // Always add country for global clarity
        locationLabel = `${locationLabel}, ${result.countryName}`;

        // Determine type based on feature code
        let type = "city";
        if (result.fcodeName?.includes("administrative")) {
          type = result.adminName1 ? "state" : "region";
        }

        return {
          label: locationLabel,
          value: locationValue,
          type: type,
          population: result.population || 0,
          countryCode: result.countryCode || "",
        };
      })
      .filter((suggestion: LocationSuggestion, index: number, self: LocationSuggestion[]) => {
        // Remove duplicates based on value
        return index === self.findIndex((s) => s.value === suggestion.value);
      })
      .sort((a: any, b: any) => {
        // Sort by population globally (highest first)
        return (b.population || 0) - (a.population || 0);
      })
      .slice(0, 10) // Take top 10 results
      .map((suggestion: any) => {
        const { population, countryCode, ...rest } = suggestion;
        return rest;
      }); // Remove temporary fields

    return NextResponse.json({ suggestions });
  } catch (error: any) {
    console.error("[locations/search] Unexpected error:", error);
    console.error("[locations/search] Error stack:", error?.stack);
    return NextResponse.json(
      { error: `Failed to search locations: ${error?.message || "Unknown error"}` },
      { status: 500 }
    );
  }
}

