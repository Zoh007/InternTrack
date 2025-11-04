"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";

type ApplicationStatus = {
  id: string;
  company_name: string;
  job_title: string;
  status: string;
  applied_at?: string;
  notes?: string;
};

type SessionStatus = {
  status: string;
  current_count: number;
  target_count: number;
  current_job?: {
    company: string;
    title: string;
  };
};

type JobFound = {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  source: string;
  created_at: string;
};

function LiveDashboardContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");

  const [sessionStatus, setSessionStatus] = useState<SessionStatus | null>(null);
  const [applications, setApplications] = useState<ApplicationStatus[]>([]);
  const [foundJobs, setFoundJobs] = useState<JobFound[]>([]);
  const [isPaused, setIsPaused] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationStatus | null>(null);
  const [applicationScreenshots, setApplicationScreenshots] = useState<Array<{ step: string; url: string; timestamp: string }>>([]);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [watchingApplicationId, setWatchingApplicationId] = useState<string | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (status === "loading") return;
    if (!session) {
      router.push("/");
      return;
    }
    if (!sessionId) {
      router.push("/apply");
      return;
    }
  }, [session, status, sessionId, router]);

  // Set up SSE connection for real-time updates
  useEffect(() => {
    if (!sessionId) return;

    // Initial load of session status
    const loadInitialData = async () => {
      try {
        const response = await fetch(`/api/apply/status?sessionId=${sessionId}`);
        if (response.ok) {
          const data = await response.json();
          setSessionStatus(data.session);
          setApplications(data.applications || []);
          setFoundJobs(data.jobs || []);
          setIsPaused(data.session?.status === "paused");
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Failed to load initial data:", error);
        setIsLoading(false);
      }
    };

    loadInitialData();

    // Connect to SSE endpoint
    const eventSource = new EventSource(`/api/apply/events?sessionId=${sessionId}`);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        console.log("SSE message received:", message.type);

        switch (message.type) {
          case "session":
            setSessionStatus(message.data);
            setIsPaused(message.data?.status === "paused");
            break;

          case "jobs":
            // Full jobs list update
            setFoundJobs(message.data || []);
            break;

          case "job":
            // New job(s) added
            const newJobs = Array.isArray(message.data) ? message.data : [message.data];
          setFoundJobs((prev) => {
              const existingIds = new Set(prev.map((job) => job.id));
              const uniqueNewJobs = newJobs.filter((job: JobFound) => !existingIds.has(job.id));
              return [...uniqueNewJobs, ...prev];
            });
            break;

          case "applications":
            // Full applications list update
            setApplications(message.data || []);
            // If viewing an application, update its screenshots
            if (selectedApplication || watchingApplicationId) {
              const appId = watchingApplicationId || selectedApplication?.id;
              const updatedApp = message.data?.find((a: ApplicationStatus) => a.id === appId);
              if (updatedApp?.notes) {
                try {
                  const notesData = JSON.parse(updatedApp.notes);
                  if (notesData.screenshots) {
                    setApplicationScreenshots(notesData.screenshots);
                    // If this is a live application we're watching, auto-open the modal
                    if (watchingApplicationId && updatedApp.status === "applying") {
                      setSelectedApplication(updatedApp);
                    }
                  }
                } catch (e) {
                  // Notes not JSON
                }
              }
            }
            break;

          default:
            console.log("Unknown message type:", message.type);
        }
      } catch (error) {
        console.error("Error parsing SSE message:", error);
          }
    };

    eventSource.onerror = (error) => {
      console.error("SSE connection error:", error);
      // SSE will automatically reconnect
    };

    // Cleanup on unmount
    return () => {
      eventSource.close();
      eventSourceRef.current = null;
    };
  }, [sessionId]);

  const handlePause = async () => {
    try {
      const response = await fetch(`/api/apply/pause?sessionId=${sessionId}`, {
        method: "POST",
      });
      if (response.ok) {
        setIsPaused(true);
      }
    } catch (error) {
      console.error("Failed to pause:", error);
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch(`/api/apply/resume?sessionId=${sessionId}`, {
        method: "POST",
      });
      if (response.ok) {
        setIsPaused(false);
      }
    } catch (error) {
      console.error("Failed to resume:", error);
    }
  };

  const handleStop = async () => {
    if (!confirm("Are you sure you want to stop? Applications in progress will complete.")) {
      return;
    }
    try {
      const response = await fetch(`/api/apply/stop?sessionId=${sessionId}`, {
        method: "POST",
      });
      if (response.ok) {
        router.push("/tracker");
      }
    } catch (error) {
      console.error("Failed to stop:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg">Loading dashboard...</p>
      </div>
    );
  }

  const progress = sessionStatus
    ? Math.round((sessionStatus.current_count / sessionStatus.target_count) * 100)
    : 0;

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Auto-Apply in Progress</h1>
        <p className="text-gray-600">Watch as we apply to {sessionStatus?.target_count || 0} jobs for you</p>
      </div>

      {/* Progress Card */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              {sessionStatus?.current_count || 0} / {sessionStatus?.target_count || 0} Applications
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Status: <span className="font-medium capitalize">{sessionStatus?.status || "pending"}</span>
            </p>
          </div>
          <div className="flex gap-2">
            {isPaused ? (
              <button
                onClick={handleResume}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                ▶ Resume
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
              >
                ⏸ Pause
              </button>
            )}
            <button
              onClick={handleStop}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Stop
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div
            className="bg-blue-600 h-4 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        <p className="text-sm text-gray-600 text-center">{progress}% Complete</p>

        {/* Current Job - Show only when manually applying (not auto-apply) */}
        {(() => {
          // Only show if there's a manually triggered application (has watchingApplicationId)
          const currentApplying = watchingApplicationId 
            ? applications.find(app => app.id === watchingApplicationId && app.status === "applying")
            : null;
          return currentApplying ? (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200 animate-pulse">
              <p className="text-sm text-gray-600 mb-1 flex items-center gap-2">
                <span className="animate-spin">⏳</span>
                Currently applying to:
              </p>
              <p className="font-semibold text-lg">
                {currentApplying.job_title} at {currentApplying.company_name}
              </p>
            </div>
          ) : null;
        })()}
      </div>

      {/* Found Jobs - Real-time */}
      <div className="bg-white rounded-lg border shadow-sm p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-semibold">
              Jobs Found ({sessionStatus?.target_count || foundJobs.length})
            </h2>
            {foundJobs.length > (sessionStatus?.target_count || 0) && (
              <p className="text-xs text-gray-500 mt-1">
                Found {foundJobs.length} total jobs (showing top {sessionStatus?.target_count || foundJobs.length})
              </p>
            )}
          </div>
          <span className="text-sm text-gray-500">
            {sessionStatus?.status === "searching" && (
              <span className="inline-flex items-center gap-2">
                <span className="animate-pulse w-2 h-2 bg-blue-600 rounded-full"></span>
                Searching...
              </span>
            )}
          </span>
        </div>
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {foundJobs.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              {sessionStatus?.status === "searching" 
                ? "Searching for jobs..." 
                : "No jobs found yet"}
            </p>
          ) : (
            foundJobs.slice(0, sessionStatus?.target_count || foundJobs.length).map((job) => {
              const isDisabled = applyingJobId === job.id || applications.some(
                app => app.job_title === job.title && app.company_name === job.company && app.status === "applied"
              );
              console.log(`Rendering button for job ${job.id} (${job.title}): disabled=${isDisabled}`);
              return (
              <div
                key={job.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-all duration-300"
              >
                <div className="flex-1">
                  <p className="font-semibold text-lg">{job.title}</p>
                  <p className="text-sm text-gray-600">{job.company}</p>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-500">{job.location}</span>
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded">
                      {job.source}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    View Job
                  </a>
                  <button
                    type="button"
                    onMouseDown={(e) => {
                      console.log("Button mousedown event fired for job:", job.id);
                      e.stopPropagation();
                    }}
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log("Apply using AI clicked for job:", job.id, job.title);
                      console.log("Button disabled state:", applyingJobId === job.id, applications.some(
                        app => app.job_title === job.title && app.company_name === job.company
                      ));
                      
                      // Check if already applied
                      const alreadyApplied = applications.some(
                        app => app.job_title === job.title && app.company_name === job.company && app.status === "applied"
                      );
                      
                      if (alreadyApplied) {
                        alert("You've already applied to this job!");
                        return;
                      }

                      console.log("Opening job page:", job.url);
                      // Open job page in new window first
                      window.open(job.url, '_blank', 'noopener,noreferrer');
                      
                      setApplyingJobId(job.id);
                      setWatchingApplicationId(null);
                      setSelectedApplication(null);
                      setApplicationScreenshots([]);
                      
                      // Small delay to let the page open
                      await new Promise(resolve => setTimeout(resolve, 500));
                      
                      try {
                        console.log("Calling API: /api/apply/apply-job", { jobId: job.id, sessionId });
                        const response = await fetch(`/api/apply/apply-job?jobId=${job.id}&sessionId=${sessionId}`, {
                          method: "POST",
                        });
                        
                        console.log("API response status:", response.status);
                        const data = await response.json();
                        console.log("API response data:", data);
                        
                        if (response.ok) {
                          console.log("API call succeeded");
                          let applicationIdToUse = data.applicationId;
                          
                          // If no applicationId in response, wait and fetch from status
                          if (!applicationIdToUse) {
                            console.warn("No applicationId in response, fetching from status...");
                            // Give it a moment for the application to be created
                            await new Promise(resolve => setTimeout(resolve, 1000));
                            const statusCheckResponse = await fetch(`/api/apply/status?sessionId=${sessionId}`);
                            if (statusCheckResponse.ok) {
                              const statusCheckData = await statusCheckResponse.json();
                              // Find the most recent "applying" application for this job
                              const recentApp = statusCheckData.applications?.find(
                                (a: ApplicationStatus) => a.job_title === job.title && a.company_name === job.company && a.status === "applying"
                              );
                              if (recentApp) {
                                applicationIdToUse = recentApp.id;
                                console.log("Found application ID from status:", applicationIdToUse);
                              }
                            }
                          }
                          
                          if (applicationIdToUse) {
                            console.log("Application created successfully:", applicationIdToUse);
                            // Immediately fetch the new application
                            const statusResponse = await fetch(`/api/apply/status?sessionId=${sessionId}`);
                            if (statusResponse.ok) {
                              const statusData = await statusResponse.json();
                              const newApp = statusData.applications?.find(
                                (a: ApplicationStatus) => a.id === applicationIdToUse
                              );
                            
                              if (newApp) {
                              setWatchingApplicationId(newApp.id);
                              setSelectedApplication(newApp);
                              setApplications((prev) => {
                                const exists = prev.find(a => a.id === newApp.id);
                                return exists ? prev : [...prev, newApp];
                              });
                              
                              // Poll for live updates (SSE should handle this, but poll as backup)
                              const pollInterval = setInterval(async () => {
                                const pollResponse = await fetch(`/api/apply/status?sessionId=${sessionId}`);
                                if (pollResponse.ok) {
                                  const pollData = await pollResponse.json();
                                  const updatedApp = pollData.applications?.find(
                                    (a: ApplicationStatus) => a.id === applicationIdToUse
                                  );
                                  if (updatedApp) {
                                    setApplications((prev) => {
                                      return prev.map(a => a.id === updatedApp.id ? updatedApp : a);
                                    });
                                    
                                    // Update screenshots if available
                                    if (updatedApp.notes) {
                                      try {
                                        const notesData = JSON.parse(updatedApp.notes);
                                        if (notesData.screenshots) {
                                          setApplicationScreenshots(notesData.screenshots);
                                          setSelectedApplication(updatedApp);
                                        }
                                      } catch (e) {}
                                    }
                                    
                                    // Stop polling if application is complete
                                    if (updatedApp.status !== "applying") {
                                      clearInterval(pollInterval);
                                      setApplyingJobId(null);
                                      setWatchingApplicationId(null);
                                    }
                                  }
                                }
                              }, 1500); // Poll every 1.5 seconds for live updates
                              
                              // Clean up interval after 5 minutes max
                              setTimeout(() => {
                                clearInterval(pollInterval);
                              }, 300000);
                              }
                            }
                          } else {
                            // If application creation succeeded but we can't find it yet, wait a bit
                            setTimeout(async () => {
                              const retryResponse = await fetch(`/api/apply/status?sessionId=${sessionId}`);
                              if (retryResponse.ok) {
                                const retryData = await retryResponse.json();
                                const retryApp = retryData.applications?.find(
                                  (a: ApplicationStatus) => (a.job_title === job.title && a.company_name === job.company && a.status === "applying")
                                );
                                if (retryApp) {
                                  setWatchingApplicationId(retryApp.id);
                                  setSelectedApplication(retryApp);
                                  setApplications((prev) => {
                                    const exists = prev.find(a => a.id === retryApp.id);
                                    return exists ? prev : [...prev, retryApp];
                                  });
                                }
                              }
                              setApplyingJobId(null);
                            }, 2000);
                          }
                        } else {
                          console.error("API returned error:", data);
                          alert(data.error || "Failed to apply to job. Check console for details.");
                          setApplyingJobId(null);
                        }
                      } catch (error) {
                        console.error("Error applying to job:", error);
                        alert(`Failed to apply to job: ${error instanceof Error ? error.message : "Unknown error"}`);
                        setApplyingJobId(null);
                      }
                    }}
                    disabled={applyingJobId === job.id || applications.some(
                      app => app.job_title === job.title && app.company_name === job.company && app.status === "applied"
                    )}
                    className={`px-3 py-1 rounded-lg transition-colors text-sm ${
                      applyingJobId === job.id
                        ? "bg-gray-400 text-white cursor-not-allowed"
                        : "bg-purple-600 text-white hover:bg-purple-700"
                    }`}
                  >
                    {applyingJobId === job.id ? (
                      <span className="flex items-center gap-2">
                        <span className="animate-spin">⏳</span>
                        Applying...
                      </span>
                    ) : (
                      "🤖 Apply using AI"
                    )}
                  </button>
                  <span className="text-xs text-gray-400">
                    {new Date(job.created_at).toLocaleTimeString()}
                  </span>
                </div>
              </div>
              );
            })
          )}
        </div>
      </div>

      {/* Applications List */}
      <div className="bg-white rounded-lg border shadow-sm p-6">
        <h2 className="text-xl font-semibold mb-4">Applications Submitted ({applications.length})</h2>
        <div className="space-y-2">
          {applications.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No applications yet. Jobs are being searched...</p>
          ) : (
            applications.map((app) => {
              let screenshotsCount = 0;
              try {
                if (app.notes) {
                  const notesData = JSON.parse(app.notes);
                  screenshotsCount = notesData.screenshots?.length || 0;
                }
              } catch (e) {
                // Notes not JSON
              }
              
              return (
                <div
                  key={app.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSelectedApplication(app);
                    // Load screenshots
                    if (app.notes) {
                      try {
                        const notesData = JSON.parse(app.notes);
                        setApplicationScreenshots(notesData.screenshots || []);
                      } catch (e) {
                        setApplicationScreenshots([]);
                      }
                    } else {
                      setApplicationScreenshots([]);
                    }
                  }}
                >
                  <div>
                    <p className="font-semibold">{app.job_title}</p>
                    <p className="text-sm text-gray-600">{app.company_name}</p>
                    {screenshotsCount > 0 && (
                      <p className="text-xs text-blue-600 mt-1">📸 {screenshotsCount} screenshots</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        app.status === "applied"
                          ? "bg-green-100 text-green-700"
                          : app.status === "error"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {app.status}
                    </span>
                    {app.applied_at && (
                      <span className="text-sm text-gray-500">
                        {new Date(app.applied_at).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Screenshot Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold">AI Form Filling Preview</h3>
                <p className="text-sm text-gray-600">
                  {selectedApplication.job_title} at {selectedApplication.company_name}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedApplication(null);
                  setApplicationScreenshots([]);
                }}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                ×
              </button>
            </div>
            <div className="overflow-y-auto p-6 flex-1">
              {applicationScreenshots.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">
                    {selectedApplication.status === "applying" 
                      ? "Screenshots will appear as the form is filled..." 
                      : "No screenshots available"}
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {applicationScreenshots.map((screenshot, index) => (
                    <div key={index} className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2 border-b">
                        <p className="font-medium text-sm">{screenshot.step}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(screenshot.timestamp).toLocaleString()}
                        </p>
                      </div>
                      <img
                        src={screenshot.url}
                        alt={screenshot.step}
                        className="w-full h-auto"
                        loading="lazy"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LiveDashboardPage() {
  return (
    <Suspense fallback={
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg">Loading dashboard...</p>
      </div>
    }>
      <LiveDashboardContent />
    </Suspense>
  );
}

