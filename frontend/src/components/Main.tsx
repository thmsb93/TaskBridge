import { useState, useEffect } from "react";
import { format, formatISO } from 'date-fns';
import { ChevronDown, ChevronUp } from "lucide-react";
import { motion } from "framer-motion";
import { JobStatus } from "../constants/jobStatus";
import { CopyToClipboard } from "react-copy-to-clipboard";
import SyntaxHighlighter from "react-syntax-highlighter";

const BACKEND_URL = "http://127.0.0.1:8000"; // Replace with your backend URL or do something smarter to determine it dynamically
console.log("BACKEND_URL:", BACKEND_URL);

export default function Home() {
    useEffect(() => {
        document.body.style.backgroundImage = "url('/taskbridge_background.jpg')";
        document.body.style.backgroundSize = "cover";
        document.body.style.backgroundAttachment = "fixed";
        document.body.style.backgroundPosition = "center";
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        return () => {
            document.body.style.backgroundImage = "";
            document.body.style.backgroundSize = "";
            document.body.style.backgroundAttachment = "";
            document.body.style.backgroundPosition = "";
        };
    }, []);

    const [backendOnline, setBackendOnline] = useState(false); /* Track if the backend is online */
    const [file2Upload, setFile2Upload] = useState<File | null>(null); /* Track the selected file */
    const [searchTerm, setSearchTerm] = useState(""); /* Track the search term for filtering jobs */
    const [jobs, setJobs] = useState<any[]>([]); /* Track the list of jobs */
    const [uploadingJobId, setUploadingJobId] = useState<string | null>(null); /* Track the job ID of the currently uploading job */
    const [userId, setUserId] = useState(""); /* Track the user ID, can be set dynamically or fetched from auth */
    const [filterByUser, setFilterByUser] = useState(false); /* Track if the user wants to filter jobs by their own user ID */
    const [downloading, setDownloading] = useState<string | null>(null); /* Track the job ID of the currently downloading job */
    const [progress, setProgress] = useState<number>(0); /* Track the download progress of the currently downloading job */
    const [openJobList, setOpenJobList] = useState(false); /* Track if the job list is open or closed */
    const [errorPopup, setErrorPopup] = useState<{ visible: boolean; message: string | null }>({ 
        visible: false,
        message: null,
    }); /* Track the error popup state and message */

    useEffect(() => {
        const timeoutPromise = new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), 3000)
        );

        Promise.race([
            fetch(`${BACKEND_URL}/get_jobs/`, { cache: "no-store" }),
            timeoutPromise,
        ])
            .then((res) => {
                if (!res.ok) {
                    console.error("Backend not online:", res.status);
                    throw new Error("Timeout");
                }
                setBackendOnline(true);
                return res.json();
            })
            .then((data) => setJobs(data))
            .catch((error) => {
                console.error("Backend not online:", error);
                setBackendOnline(false);
            });
    }, []);

    useEffect(() => {
        if (!backendOnline) return;
        // Establish WebSocket connection to the backend
        const ws = new WebSocket(`${BACKEND_URL.replace("http", "ws")}/ws`);

        ws.onopen = () => {
            console.log("WebSocket connection established");
        };

        ws.onerror = (event) => {
            console.error("WebSocket Error:", event);
        };

        ws.onclose = (event) => {
            console.warn("Closed WebSocket connection:", event);
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            setJobs(data);
        };

        return () => ws.close();
    }, [backendOnline]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        /* Handle file selection */
        if (event.target.files && event.target.files.length > 0) {
            setFile2Upload(event.target.files[0]);
        }
    };


    const startFileUpload = async () => {
        console.log("Starting file upload...");
        if (!file2Upload) {
            alert("Please select a file to upload.");
            return;
        }

        const tempId = `temp-${Date.now()}`;
        setUploadingJobId(tempId);

        const tempJob = {
            job_id: tempId,
            filename: file2Upload.name,
            status: JobStatus.DataTransfer,
            progress: 0,
            upload_progress: 0,
            user_id: userId,
            started_at: formatISO(new Date()), // Store as ISO 8601 string
        };
        setJobs((prevJobs) => [...prevJobs, tempJob]);

        try {
            // This would be the place to handle some user identification logic
            // For example, you could fetch the user ID from a global state or context
            // Prepare headers
            const headers: Record<string, string> = {
                ...(userId ? { "X-User-ID": userId } : {}),
            };

            const xhr = new XMLHttpRequest();
            xhr.open(
                "POST",
                `${BACKEND_URL}/start_job_upload/?filename=${encodeURIComponent(file2Upload.name)}`,
                true
            );

            Object.entries(headers).forEach(([key, value]) => {
                xhr.setRequestHeader(key, value);
            });

            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = Math.round((event.loaded / event.total) * 100);
                    setJobs((prevJobs) =>
                        prevJobs.map((job) =>
                            job.job_id === tempId ? { ...job, upload_progress: percentComplete } : job
                        )
                    );
                }
            };

            xhr.onload = () => {
                if (xhr.status === 200) {
                    const result = JSON.parse(xhr.responseText);
                    const realJobId = result.job_id;
                    setJobs((prevJobs) =>
                        prevJobs.map((job) =>
                            job.job_id === tempId
                                ? {
                                    ...job,
                                    job_id: realJobId,
                                    upload_progress: undefined,
                                    status: "Queued",
                                    progress: 10,
                                }
                                : job
                        )
                    );
                    setUploadingJobId(null);
                } else {
                    alert("Upload failed");
                    setJobs((prevJobs) => prevJobs.filter((j) => j.job_id !== tempId));
                    setUploadingJobId(null);
                }
            };

            xhr.onerror = () => {
                alert("Upload failed");
                setJobs((prevJobs) => prevJobs.filter((j) => j.job_id !== tempId));
                setUploadingJobId(null);
            };

            xhr.send(file2Upload);
        } catch (error) {
            console.error("File upload failed", error);
            alert("File upload failed");
            setJobs((prevJobs) => prevJobs.filter((j) => j.job_id !== tempId));
            setUploadingJobId(null);
        }
    };

    const triggerNewJob = async () => {
        console.log("Triggering new job...");
        if (file2Upload) {
            await startFileUpload();
        } else {
            alert("Please provide either a file.");
            return;
        }

        // Open the job list after triggering a new job
        setOpenJobList(true);
    };

    const clearJobs = async () => {
        await fetch(`${BACKEND_URL}/clear_jobs/`, { method: "DELETE" });
        setJobs([]);
    };

    const handleDownload = async (jobId: string, jobFilename: string, setDownloading: (id: string | null) => void, setProgress: (progress: number) => void) => {
        const userConfirmed = window.confirm("Are you sure you want to download the file?");
        if (!userConfirmed) return;

        setDownloading(jobId); // Set the downloading state to the current job ID
        setProgress(0); // Initialize progress to 0

        try {
            const response = await fetch(`${BACKEND_URL}/download/${jobId}`);
            if (!response.ok) {
                throw new Error("Failed to download file");
            }

            const contentLength = response.headers.get("Content-Length");
            const total = contentLength ? parseInt(contentLength, 10) : 0;
            let loaded = 0;

            const reader = response.body?.getReader();
            const chunks: Uint8Array[] = [];

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    if (value) {
                        chunks.push(value);
                        loaded += value.length;
                        if (total) {
                            const percentComplete = Math.round((loaded / total) * 100);
                            setProgress(percentComplete); // Update progress
                        }
                    }
                }
            }

            const blob = new Blob(chunks);
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = jobFilename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error downloading file:", error);
            alert("Failed to download the file. Please try again later.");
        } finally {
            setDownloading(null); // Reset the downloading state
            setProgress(0); // Reset progress
        }
    };

    const showErrorPopup = (message: string) => {
        setErrorPopup({ visible: true, message });
    };

    const closeErrorPopup = () => {
        setErrorPopup({ visible: false, message: null });
    };

    // Sort jobs by status and date
    // Non-complete jobs first, then complete jobs
    // Within each group, sort by date descending
    const sortedJobsByStatusAndDate = jobs
        .filter((job) => {
            const matchesSearchTerm =
                job.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.status.toLowerCase().includes(searchTerm.toLowerCase()) ||
                job.user_id.toLowerCase().includes(searchTerm.toLowerCase());
            const matchesUserId = !filterByUser || job.user_id === userId;
            return matchesUserId && matchesSearchTerm;
        })
        .sort((a, b) => {
            // Sort by status: non-complete jobs first, then complete jobs
            if (a.status === JobStatus.Completed && b.status !== JobStatus.Completed) return 1;
            if (a.status !== JobStatus.Completed && b.status === JobStatus.Completed) return -1;

            // If both have the same status, sort by date
            const date_a = new Date(a.started_at).getTime();
            const date_b = new Date(b.started_at).getTime();
            return date_b - date_a; // Descending order by date
        });


    return (
        <div className="container">
            {/* Error Popup */}
            {errorPopup.visible && (
                <div className="error-popup-overlay">
                    <div className="error-popup">
                        <div className="error-popup-header">
                            <h3>Error Details</h3>
                            <button onClick={closeErrorPopup} className="close-button">
                                ✖
                            </button>
                        </div>
                        <div className="error-popup-content">
                            <SyntaxHighlighter language="python">
                                {errorPopup.message || ""}
                            </SyntaxHighlighter>
                        </div>
                        <div className="error-popup-footer">
                            <CopyToClipboard text={errorPopup.message || ""}>
                                <button className="copy-button">Copy to Clipboard</button>
                            </CopyToClipboard>
                        </div>
                    </div>
                </div>
            )}
            {!backendOnline && (
                <div className="text-center mt-8 text-xl font-bold">
                    <h2>Backend is offline</h2>
                    <p>
                        The backend is apparently not reachable at this moment. Please try again later.
                    </p>
                </div>
            )}

            <div className="input-wrapper">
                <div className="upload-box">
                    <h2>Upload file</h2>
                    <input id="file-input" type="file" onChange={handleFileChange} className="input-field" />
                    <div style={{ display: "flex", gap: "1rem", marginBottom: "1rem" }}>
                        <button 
                            onClick={backendOnline ? triggerNewJob : undefined}
                            className={`
                                px-4 py-2 rounded-md font-bold
                                transition-all duration-300 ease-in-out
                                ${backendOnline
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                                    : 'bg-gray-200 text-gray-400 border border-gray-300 cursor-not-allowed opacity-60 shadow-none'
                                }
                            `}
                            disabled={!backendOnline}                        
                        >
                            Trigger new Job
                        </button>
                    </div>
                </div>
            </div>

            <div className="job-frame">
                <div className="cooler_chevron">
                    <button
                        onClick={() => setOpenJobList(!openJobList)}
                        className="flex flex-col items-center gap-1 text-lg font-medium text-white hover:text-purple-200"
                    >
                        <span className="leading-none">{openJobList ? 'Close Job List' : 'Open Job List'}</span>
                        <ChevronDown
                            className={`w-8 h-6 transition-transform duration-500 ${openJobList ? 'rotate-180' : ''}`}
                        />
                    </button>
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: openJobList ? 'auto' : 0, opacity: openJobList ? 1 : 0 }}
                        transition={{ duration: 0.5, ease: 'easeInOut' }}
                        className="job_list_panel"
                    >
                        <div className="job-header">
                            <div style={{ display: "flex", alignItems: "center", gap: "1rem", width: "100%" }}>
                                <input
                                    id="search-input"
                                    type="text"
                                    className="input-field"
                                    placeholder="Search jobs by filename, status or user..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                <button onClick={clearJobs} className="button danger">
                                    Clear Jobs
                                </button>
                            </div>
                            <div style={{ marginTop: "0.5rem" }}>
                                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                                    <input
                                        type="checkbox"
                                        checked={filterByUser}
                                        onChange={(e) => setFilterByUser(e.target.checked)}
                                    />
                                    Show only my jobs
                                </label>
                            </div>
                        </div>
                        <div className="job-table">
                            <div className="mt-4 bg-white shadow rounded overflow-x-auto">
                                <table className="min-w-full border border-gray-200">
                                    <thead className="bg-gray-100">
                                        <tr>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600" style={{ width: "7.5%" }}>Actions</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600" style={{ width: "17.5%" }}>Date</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600" style={{ width: "22.5%" }}>User ID</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600" style={{ width: "30.0%" }}>Filename</th>
                                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-600" style={{ width: "22.5%" }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {sortedJobsByStatusAndDate.length > 0 ? (
                                            sortedJobsByStatusAndDate.map((job) => (
                                                <tr key={job.job_id}>
                                                    <td>
                                                        {job.status === JobStatus.Completed ? (
                                                            <div className="job-actions" style={{ display: "flex", gap: "0.25rem" }}>
                                                                <button
                                                                    className="button-download"
                                                                    onClick={() => handleDownload(job.job_id, job.filename, setDownloading, setProgress)}
                                                                    disabled={downloading === job.job_id}
                                                                    title="Download file"
                                                                >
                                                                    {downloading === job.job_id ? (
                                                                        <div
                                                                            className="spinner"
                                                                            style={{
                                                                                background: `conic-gradient(#4caf50 ${progress}%, rgba(0, 0, 0, 0.1) ${progress}%)`,
                                                                            }}
                                                                        ></div>
                                                                    ) : (
                                                                        <img
                                                                            src="/download_icon.webp"
                                                                            alt="Download Icon"
                                                                            style={{ width: "24px", height: "24px" }}
                                                                        />
                                                                    )}
                                                                </button>
                                                            </div>
                                                        ) : job.status === JobStatus.Failed ? (
                                                            <div className="job-actions" style={{ display: "flex", gap: "0.25rem" }}>
                                                                <button
                                                                    className="button-error-message"
                                                                    onClick={() => showErrorPopup(job.error_message || "No error message available.")}
                                                                    title="Show Error Message"
                                                                >
                                                                    <img
                                                                        src="/error_message_icon.png"
                                                                        alt="Error Message Icon"
                                                                        style={{ width: "24px", height: "24px" }}
                                                                    />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <></>
                                                        )}
                                                    </td>
                                                    <td>{format(new Date(job.started_at), 'dd.MM.yyyy HH:mm:ss')}</td>
                                                    <td><p className="break-all">{job.user_id}</p></td>
                                                    <td><p className="break-all">{job.filename}</p></td>
                                                    <td>
                                                        <span
                                                            style={{
                                                                color:
                                                                    job.status === JobStatus.Completed
                                                                        ? "green"
                                                                        : job.status === JobStatus.Running
                                                                            ? "blue"
                                                                            : job.status === JobStatus.Failed
                                                                                ? "red"
                                                                                : job.status === JobStatus.DataTransfer
                                                                                    ? "orange"
                                                                                    : "black",
                                                            }}
                                                            className={job.status === JobStatus.DataTransfer ? "pulsing-text" : ""}
                                                        >
                                                            {job.status}
                                                        </span>
                                                        {job.upload_progress !== undefined &&
                                                            job.status !== JobStatus.Completed &&
                                                            job.status !== JobStatus.Failed && (
                                                                <>
                                                                    <div className="upload-progress-bar">
                                                                        <div
                                                                            className="upload-progress"
                                                                            style={{ width: `${job.upload_progress}%` }}
                                                                        />
                                                                    </div>
                                                                    <p className="running-job-status-label">
                                                                        Uploading: {job.upload_progress}%
                                                                    </p>
                                                                    <div className="progress-bar">
                                                                        <div
                                                                            className={`progress`}
                                                                            style={{ width: `${job.progress}%` }}
                                                                        >
                                                                        </div>
                                                                    </div>
                                                                    <p className="running-job-status-label">
                                                                        {job.description} {job.progress}%
                                                                    </p>
                                                                </>
                                                            )}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={4} style={{ textAlign: "center", padding: "1rem" }}>
                                                    No data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </div>
    );
}
