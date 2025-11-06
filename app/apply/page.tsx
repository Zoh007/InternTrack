"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { parsePdfClientSide } from "../../lib/resumeTextProcessor";

export default function ApplyPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<"resume" | "preferences">("resume");
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isUploadingResume, setIsUploadingResume] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState("Uploading your resume");
  const [uploadSubtext, setUploadSubtext] = useState("This may take a few seconds");
  const [showSuccess, setShowSuccess] = useState(false);
  const [formData, setFormData] = useState({
    jobTypes: [] as string[],
    locations: [] as string[],
    remotePreference: "",
    salaryMin: "",
    salaryMax: "",
    numberOfApplications: 10,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProgress, setSearchProgress] = useState("");
  
  // Location autocomplete state
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{label: string; value: string; type: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingLocations, setIsLoadingLocations] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const locationInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced location search
  useEffect(() => {
    if (locationQuery.length < 2) {
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoadingLocations(true);
      setLocationError(null);
      try {
        const response = await fetch(`/api/locations/search?q=${encodeURIComponent(locationQuery)}`);
        const data = await response.json();
        
        if (response.ok) {
          setLocationSuggestions(data.suggestions || []);
          setShowSuggestions(true);
        } else {
          // Handle API errors
          setLocationError(data.error || "Failed to search locations");
          setLocationSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (error) {
        console.error("Failed to search locations:", error);
        setLocationError("Failed to search locations. Please try again.");
        setLocationSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingLocations(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [locationQuery]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        locationInputRef.current &&
        !locationInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Redirect effect - must be after all hooks
  useEffect(() => {
    if (status !== "loading" && !session) {
      router.push("/");
    }
  }, [session, status, router]);

  if (status === "loading") {
    return <div className="text-center py-12">Loading...</div>;
  }

  if (!session) {
    return null;
  }

  const jobTypeOptions = [
    "Software Engineer",
    "Data Scientist",
    "Product Manager",
    "UX Designer",
    "Marketing Manager",
    "Financial Analyst",
    "Consultant",
    "Research Analyst",
    "Sales Representative",
    "Operations Manager",
    "Business Analyst",
    "Project Manager",
    "Accountant",
    "Human Resources",
    "Customer Success",
    "Content Writer",
    "Graphic Designer",
    "Mechanical Engineer",
    "Electrical Engineer",
    "Data Analyst",
  ];

  const handleJobTypeToggle = (type: string) => {
    setFormData((prev) => ({
      ...prev,
      jobTypes: prev.jobTypes.includes(type)
        ? prev.jobTypes.filter((t) => t !== type)
        : [...prev.jobTypes, type],
    }));
  };

  const handleLocationSelect = (location: {label: string; value: string}) => {
    if (!formData.locations.includes(location.value)) {
      setFormData((prev) => ({
        ...prev,
        locations: [...prev.locations, location.value],
      }));
    }
    setLocationQuery("");
    setShowSuggestions(false);
  };

  const handleRemoveLocation = (location: string) => {
    setFormData((prev) => ({
      ...prev,
      locations: prev.locations.filter((l) => l !== location),
    }));
  };

  const handleRemoteToggle = () => {
    const remoteValue = "Remote";
    if (formData.locations.includes(remoteValue)) {
      handleRemoveLocation(remoteValue);
    } else {
      handleLocationSelect({ label: remoteValue, value: remoteValue });
    }
  };

  const handleResumeUpload = async () => {
    if (!resumeFile) {
      alert("Please upload your resume PDF");
      return;
    }

    setIsUploadingResume(true);
    setUploadProgress(0);
    setShowSuccess(false);
    setUploadStatus("Uploading your resume");
    setUploadSubtext("Preparing file...");

    try {
      // Step 1: Parse PDF client-side using pdf.js (10-40%)
      setUploadProgress(10);
      setUploadStatus("Reading document");
      setUploadSubtext("Extracting text content...");
      
      console.log("[upload] Starting client-side PDF parsing...");
      const parseResult = await parsePdfClientSide(resumeFile);
      
      if (!parseResult.success || !parseResult.text) {
        throw new Error(parseResult.error || "Failed to extract text from PDF. Please ensure your PDF contains selectable text (not just scanned images).");
      }

      setUploadProgress(40);
      setUploadStatus("Uploading to server");
      setUploadSubtext("Securing your data...");

      console.log("[upload] Client-side parsing successful!");
      console.log("[upload] Extracted text length:", parseResult.text.length, "characters");

      // Step 2: Send file + parsed text to server
      // Progress: 40-50% (uploading file)
      const formData = new FormData();
      formData.append("resume", resumeFile);
      formData.append("additionalInfo", additionalInfo);
      formData.append("parsedText", parseResult.text);

      setUploadProgress(45);
      setUploadStatus("Uploading to server");
      setUploadSubtext("Securing your data...");

      const response = await fetch("/api/apply/upload-resume", {
        method: "POST",
        body: formData,
      });

      // Progress: 50-70% (server processing: storage + extraction)
      setUploadProgress(50);
      setUploadStatus("Storing document");
      setUploadSubtext("Saving your resume...");

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to upload resume");
      }

      setUploadProgress(60);
      setUploadStatus("Analyzing experience");
      setUploadSubtext("Identifying key information...");

      // Wait a bit to simulate server processing
      await new Promise(resolve => setTimeout(resolve, 300));

      setUploadProgress(75);
      setUploadStatus("Extracting skills");
      setUploadSubtext("Building your profile...");

      const data = await response.json();
      console.log("[upload] Resume uploaded successfully:", data);

      setUploadProgress(90);
      setUploadStatus("Finalizing");
      setUploadSubtext("Almost done...");

      await new Promise(resolve => setTimeout(resolve, 200));

      setUploadProgress(100);
      setUploadStatus("Complete");
      setUploadSubtext("Resume parsed successfully!");

      // Show success checkmark
      setShowSuccess(true);

      // Navigate to preferences after a short delay
      setTimeout(() => {
        setCurrentStep("preferences");
        setIsUploadingResume(false);
        setShowSuccess(false);
        setUploadProgress(0);
      }, 1500);
    } catch (error) {
      console.error("[upload] Error:", error);
      setIsUploadingResume(false);
      setShowSuccess(false);
      setUploadProgress(0);
      alert(error instanceof Error ? error.message : "Failed to upload resume. Please try again.");
    }
  };

  const handleSubmit = async () => {
    if (formData.jobTypes.length === 0) {
      alert("Please select at least one job type");
      return;
    }
    if (formData.locations.length === 0 && !formData.remotePreference) {
      alert("Please select at least one location or remote preference");
      return;
    }

    setIsSubmitting(true);
    setIsSearching(true);
    setSearchProgress("Searching the internet for matching jobs...");

    try {
      // Step 1: Save preferences and start job search
      const response = await fetch("/api/apply/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferences: formData,
          targetCount: formData.numberOfApplications,
        }),
      });

      if (!response.ok) throw new Error("Failed to start job search");

      const data = await response.json();
      const sessionId = data.sessionId;

      // Step 2: Start searching for jobs
      setSearchProgress("Scanning job boards (LinkedIn, Indeed, and more)...");
      
      const searchResponse = await fetch(`/api/apply/search-jobs?sessionId=${sessionId}`, {
        method: "POST",
      });

      if (!searchResponse.ok) throw new Error("Failed to search for jobs");

      // Navigate to live dashboard once jobs are found
      router.push(`/apply/live?sessionId=${sessionId}`);
    } catch (error) {
      console.error(error);
      alert("Failed to start application process. Please try again.");
      setIsSearching(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSearching) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-medium">{searchProgress}</p>
        <p className="text-sm text-gray-500 mt-2">This may take a few minutes...</p>
      </div>
    );
  }

  // Resume upload step
  if (currentStep === "resume") {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Your Resume</h1>
          <p className="text-gray-600">
            Upload your resume PDF so we can automatically fill out job applications for you
          </p>
        </div>

        {/* Loader Container */}
        {isUploadingResume && (
          <div className="loader-container active text-center py-8">
            <div className="loader-wrapper">
              {/* Circular Progress */}
              <div className="circular-progress relative w-[120px] h-[120px] mx-auto mb-6">
                <svg width="120" height="120" className="transform -rotate-90">
                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" style={{ stopColor: "#667eea", stopOpacity: 1 }} />
                      <stop offset="100%" style={{ stopColor: "#764ba2", stopOpacity: 1 }} />
                    </linearGradient>
                  </defs>
                  <circle
                    className="circle-bg"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="#e0e0e0"
                    strokeWidth="8"
                  />
                  <circle
                    className="circle-progress"
                    cx="60"
                    cy="60"
                    r="54"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray="339.292"
                    strokeDashoffset={339.292 - (uploadProgress / 100) * 339.292}
                    style={{ transition: "stroke-dashoffset 0.5s ease" }}
                  />
                </svg>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-2xl font-bold text-[#667eea]">
                  {uploadProgress}%
                </div>
              </div>

              <div className="loading-text text-lg font-semibold text-gray-900 mb-2">
                <span>{uploadStatus}</span>
                <span className="loading-dots inline-block w-4"></span>
              </div>
              <div className="loading-subtext text-sm text-gray-600">{uploadSubtext}</div>
            </div>
          </div>
        )}

        {/* Success Checkmark */}
        {showSuccess && (
          <div className="text-center py-8">
            <svg
              className="success-checkmark w-20 h-20 mx-auto mb-6 animate-[scaleIn_0.5s_ease-out]"
              viewBox="0 0 52 52"
            >
              <circle
                className="checkmark-circle"
                cx="26"
                cy="26"
                r="25"
                fill="none"
                stroke="#4CAF50"
                strokeWidth="3"
                strokeDasharray="166"
                strokeDashoffset="166"
                style={{ animation: "strokeCircle 0.6s ease-out forwards" }}
              />
              <path
                className="checkmark-check"
                d="M14.1 27.2l7.1 7.2 16.7-16.8"
                fill="none"
                stroke="#4CAF50"
                strokeWidth="3"
                strokeDasharray="48"
                strokeDashoffset="48"
                style={{ animation: "strokeCheck 0.3s 0.6s ease-out forwards" }}
              />
            </svg>
          </div>
        )}

        {/* Upload Form (hidden when uploading) */}
        {!isUploadingResume && !showSuccess && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-2">
                Resume (PDF) *
              </label>
              <input
                type="file"
                accept=".pdf"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
                className="w-full px-4 py-2 border rounded-lg"
                required
              />
              {resumeFile && (
                <p className="text-sm text-gray-500 mt-2">✓ {resumeFile.name}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Additional Information (Optional)
              </label>
              <textarea
                value={additionalInfo}
                onChange={(e) => setAdditionalInfo(e.target.value)}
                placeholder="Any additional information you'd like us to know (e.g., LinkedIn URL, portfolio, specific skills, availability, etc.)"
                className="w-full px-4 py-2 border rounded-lg h-32"
              />
            </div>

            <button
              onClick={handleResumeUpload}
              disabled={!resumeFile || isUploadingResume}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue to Preferences
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Set Your Preferences</h1>
          <button
            onClick={() => setCurrentStep("resume")}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            ← Back to Resume
          </button>
        </div>
        <p className="text-gray-600">
          Tell us what positions you're interested in, and we'll search the internet for matching jobs
        </p>
      </div>

      <div className="space-y-8">
        {/* Step 1: Job Types */}
        <div>
          <label className="block text-sm font-medium mb-3">
            What roles are you interested in? *
          </label>
          <div className="flex flex-wrap gap-2">
            {jobTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleJobTypeToggle(type)}
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  formData.jobTypes.includes(type)
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Locations */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Preferred Locations
          </label>
          
          {/* Remote option */}
          <div className="mb-3">
            <button
              type="button"
              onClick={handleRemoteToggle}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                formData.locations.includes("Remote")
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
              }`}
            >
              Remote
            </button>
          </div>

          {/* Selected locations as chips */}
          {formData.locations.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {formData.locations.map((location) => (
                <div
                  key={location}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                >
                  <span>{location}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveLocation(location)}
                    className="hover:text-blue-600 font-bold"
                    aria-label={`Remove ${location}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Location autocomplete input */}
          <div className="relative">
            <input
              ref={locationInputRef}
              type="text"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              onFocus={() => {
                if (locationSuggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              placeholder="Type to search locations worldwide (e.g., San Francisco, London, Tokyo)"
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            
            {isLoadingLocations && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div
                ref={suggestionsRef}
                className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto"
              >
                {locationSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleLocationSelect(suggestion)}
                    className="w-full text-left px-4 py-2 hover:bg-blue-50 transition-colors border-b last:border-b-0"
                  >
                    <div className="font-medium">{suggestion.label}</div>
                    <div className="text-xs text-gray-500 capitalize">{suggestion.type}</div>
                  </button>
                ))}
              </div>
            )}

            {showSuggestions && locationQuery.length >= 2 && !isLoadingLocations && locationSuggestions.length === 0 && !locationError && (
              <div className="absolute z-10 w-full mt-1 bg-white border rounded-lg shadow-lg px-4 py-2 text-gray-500 text-sm">
                No locations found
              </div>
            )}
          </div>
          
          {locationError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800">{locationError}</p>
              {locationError.includes("username") && (
                <p className="text-xs text-red-600 mt-1">
                  Sign up at <a href="https://www.geonames.org/login" target="_blank" rel="noopener noreferrer" className="underline">geonames.org</a> and enable web services in your account settings.
                </p>
              )}
            </div>
          )}
          
          <p className="text-sm text-gray-500 mt-2">
            Search and select locations worldwide where you'd like to work. You can select multiple locations from any country.
          </p>
        </div>

        {/* Step 3: Remote Preference */}
        <div>
          <label className="block text-sm font-medium mb-3">
            Remote Work Preference
          </label>
          <div className="flex gap-2">
            {["Remote", "Hybrid", "On-site", "Any"].map((option) => (
              <button
                key={option}
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, remotePreference: option.toLowerCase() }))
                }
                className={`px-4 py-2 rounded-lg border transition-colors ${
                  formData.remotePreference === option.toLowerCase()
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:border-blue-500"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>

        {/* Step 4: Salary Range */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Minimum Salary ($)
            </label>
            <input
              type="number"
              value={formData.salaryMin}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, salaryMin: e.target.value }))
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., 5000"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">
              Maximum Salary ($)
            </label>
            <input
              type="number"
              value={formData.salaryMax}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, salaryMax: e.target.value }))
              }
              className="w-full px-4 py-2 border rounded-lg"
              placeholder="e.g., 10000"
            />
          </div>
        </div>

        {/* Step 5: Number of Applications */}
        <div>
          <label className="block text-sm font-medium mb-3">
            How many jobs should we apply to?
          </label>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              value={formData.numberOfApplications}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  numberOfApplications: parseInt(e.target.value),
                }))
              }
              className="flex-1"
            />
            <span className="text-2xl font-bold text-blue-600 min-w-[60px] text-right">
              {formData.numberOfApplications}
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-2">
            We'll search the internet and apply to {formData.numberOfApplications} matching jobs based on your selected positions
          </p>
        </div>

        {/* Submit Button */}
        <div className="pt-4">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Searching for Jobs..." : "Search & Start Auto-Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
