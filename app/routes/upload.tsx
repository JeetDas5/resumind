import React, { useState } from 'react';
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import { usePuterStore } from "~/lib/puter";
import { useNavigate } from "react-router";
import { convertPdfToImage } from "~/lib/PdfToImage";
import { generateUUID } from "~/lib/utils";
import { prepareInstructions } from "../../constants";


export const meta = () => ([{ title: "Resumind | Upload" }, { name: "description", content: "Upload your resume" },])


const upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [isInternshala, setIsInternshala] = useState(false);
    const [internshalaUrl, setInternshalaUrl] = useState("");
    const [internshalaUrlError, setInternshalaUrlError] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [location, setLocation] = useState("");
    const [skills, setSkills] = useState<string[]>([]);
    const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "info" } | null>(null);

    // Show toast for 2.5 seconds
    const showToast = (message: string, type: "error" | "success" | "info" = "error") => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 2500);
    };

    const { fs, auth, isLoading, ai, kv } = usePuterStore();
    const navigate = useNavigate();

    const handleFileSelect = (file: File | null) => {
        setFile(file);
    };

    const isInternshalaUrl = internshalaUrl.trim().toLowerCase().includes("internshala.com");

    const handleInternshalaFetch = async () => {
        if (!internshalaUrl || !isInternshalaUrl) {
            setInternshalaUrlError("Please enter a valid Internshala job URL.");
            return;
        }
        setInternshalaUrlError("");
        setStatusText("Fetching job details from Internshala...");
        setIsProcessing(true);
        try {
            const response = await fetch("http://localhost:5000/api/scrape", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: internshalaUrl })
            });
            const data = await response.json();
            setCompanyName(data.company || "");
            setJobTitle(data.title || "");
            setLocation(data.location || "");
            setSkills(data.skills || []);
            let jobDescText = Array.isArray(data.jobDescription) ? data.jobDescription.join("\n") : "";
            if (data.skills && Array.isArray(data.skills) && data.skills.length > 0) {
                jobDescText += `\n\nRequired Skills: ${data.skills.join(", ")}`;
            }
            setJobDescription(jobDescText);
            setStatusText("");
        } catch (error) {
            setStatusText("Failed to fetch job details from Internshala.");
        }
        setIsProcessing(false);
    };

    const handleAnalyse = async ({ companyName, jobTitle, jobDescription, file }: {
        companyName: string, jobTitle: string, jobDescription: string, file: File
    }) => {
        setIsProcessing(true);
        setStatusText("Uploading your resume...");
        const uploadedFile = await fs.upload([file]);
        if (!uploadedFile) {
            setIsProcessing(false);
            setStatusText("Failed to upload your resume. Please try again.");
            return;
        }
        setStatusText("Converting to image...");
        const imageFile = await convertPdfToImage(file);

        if (!imageFile.file) {
            setIsProcessing(false);
            setStatusText("Failed to convert your resume to image. Please try again.");
            return;
        }
        setStatusText("Uploading the image...");
        const uploadedImage = await fs.upload([imageFile.file]);

        if (!uploadedImage) {
            setIsProcessing(false);
            setStatusText("Failed to upload your resume image. Please try again.");
            return;
        }
        setStatusText("Preparing data for analysis...");

        const uuid = generateUUID();
        const data = {
            id: uuid,
            resumePath: uploadedFile.path,
            imagePath: uploadedImage.path,
            companyName,
            jobTitle,
            jobDescription,
            feedback: ''
        };

        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText("Analysing your resume...");

        const feedback = await ai.feedback(uploadedFile.path, prepareInstructions({ jobDescription, jobTitle }));

        if (!feedback) {
            setIsProcessing(false);
            setStatusText("Failed to analyse your resume. Please try again.");
            return;
        }
        try {
            let feedbackText = '';
            if (typeof feedback.message.content === 'string') {
                feedbackText = feedback.message.content;
            } else if (Array.isArray(feedback.message.content)) {
                for (const content of feedback.message.content) {
                    if (content.type === 'text' && content.text) {
                        feedbackText = content.text;
                        break;
                    }
                }
                if (!feedbackText && feedback.message.content.length > 0) {
                    feedbackText = feedback.message.content[0].text || '';
                }
            }
            if (!feedbackText) {
                throw new Error('Could not extract text from AI response');
            }
            feedbackText = feedbackText.trim();
            if (feedbackText.startsWith('```json')) {
                feedbackText = feedbackText.substring(7);
            }
            if (feedbackText.startsWith('```')) {
                feedbackText = feedbackText.substring(3);
            }
            if (feedbackText.endsWith('```')) {
                feedbackText = feedbackText.substring(0, feedbackText.length - 3);
            }
            data.feedback = JSON.parse(feedbackText);
            await kv.set(`resume:${uuid}`, JSON.stringify(data));
            setIsProcessing(false);
            setStatusText("Resume analysed successfully. You can now review your feedback.");
            navigate(`/resume/${uuid}`);
            console.log("feedback: ", data);
        } catch (error) {
            console.error("Error processing AI feedback:", error);
            setIsProcessing(false);
            setStatusText("Failed to process AI feedback. Please try again.");
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        if (!form) return;
        let _companyName = companyName;
        let _jobTitle = jobTitle;
        let _jobDescription = jobDescription;
        if (!isInternshala) {
            const formData = new FormData(form);
            _companyName = formData.get("company-name") as string;
            _jobTitle = formData.get("job-title") as string;
            _jobDescription = formData.get("job-description") as string;
        }
        if (!file) {
            showToast("Please upload your resume before analysing.", "error");
            return;
        }
        handleAnalyse({ companyName: _companyName, jobTitle: _jobTitle, jobDescription: _jobDescription, file });
    };

    return (
        <main className="bg-[url('/images/bg-main.svg')] bg-cover">
            <div style={{ pointerEvents: 'none' }}>
                <div
                    className={`fixed left-1/2 z-50 px-6 py-3 rounded-xl shadow-lg text-white font-semibold transition-all duration-500 transform -translate-x-1/2 ${toast ? 'top-8 opacity-100 translate-y-0' : 'top-0 opacity-0 -translate-y-8'} ${toast && toast.type === "error" ? "bg-red-500" : toast && toast.type === "success" ? "bg-green-500" : toast && toast.type === "info" ? "bg-blue-500" : ""}`}
                    style={{ minWidth: '260px', maxWidth: '90vw', textAlign: 'center' }}
                >
                    {toast && toast.message}
                </div>
            </div>
            <Navbar />
            <section className="main-section">
                <div className="page-heading py-16">
                    <h1>Smart Feedback for your dream job</h1>
                    {isProcessing ? (
                        <>
                            <h2>{statusText}</h2>
                            <img src="/images/resume-scan.gif" alt="resume" className="w-full md:w-1/2 " />
                        </>
                    ) : (
                        <h2>Drop your resume for an ATS score and improvement tips</h2>
                    )}
                    {!isProcessing && (
                        <>
                            <div className="flex flex-row items-center gap-3 mb-4">
                                <label
                                    htmlFor="internshala-checkbox"
                                    className="text-lg font-semibold text-gray-800 cursor-pointer select-none"
                                >
                                    Job details from{" "}
                                    <span className="font-bold text-blue-600">Internshala</span>?
                                </label>
                                <input
                                    id="internshala-checkbox"
                                    type="checkbox"
                                    checked={isInternshala}
                                    onChange={e => setIsInternshala(e.target.checked)}
                                    className="internshala-checkbox w-6 h-6 accent-blue-600 cursor-pointer"
                                />
                            </div>
                            {isInternshala && (
                                <div className="form-div flex flex-col gap-2 mb-4">
                                    <label htmlFor="internshala-url">Internshala Job URL</label>
                                    <input
                                        type="text"
                                        id="internshala-url"
                                        name="internshala-url"
                                        placeholder="Paste Internshala job URL"
                                        value={internshalaUrl}
                                        onChange={e => {
                                            setInternshalaUrl(e.target.value);
                                            if (e.target.value && !e.target.value.toLowerCase().includes("internshala.com")) {
                                                setInternshalaUrlError("URL must be from internshala.com");
                                            } else {
                                                setInternshalaUrlError("");
                                            }
                                        }}
                                        className="input"
                                    />
                                    {internshalaUrlError && (
                                        <span className="text-red-500 text-sm">{internshalaUrlError}</span>
                                    )}
                                    <button
                                        type="button"
                                        className="primary-button w-fit"
                                        onClick={handleInternshalaFetch}
                                        disabled={!internshalaUrl || !isInternshalaUrl || isProcessing}
                                    >
                                        Fetch Job Details
                                    </button>
                                </div>
                            )}
                            <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                                <div className="form-div">
                                    <label htmlFor="company-name">Company Name</label>
                                    <input
                                        type="text"
                                        name="company-name"
                                        id="company-name"
                                        placeholder="Company Name"
                                        value={companyName}
                                        onChange={e => setCompanyName(e.target.value)}
                                        disabled={isInternshala}
                                    />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-title">Job Title</label>
                                    <input
                                        type="text"
                                        name="job-title"
                                        id="job-title"
                                        placeholder="Job Title"
                                        value={jobTitle}
                                        onChange={e => setJobTitle(e.target.value)}
                                        disabled={isInternshala}
                                    />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="job-description">Job Description</label>
                                    <textarea
                                        rows={5}
                                        name="job-description"
                                        id="job-description"
                                        placeholder="Job Description"
                                        value={jobDescription}
                                        onChange={e => setJobDescription(e.target.value)}
                                        disabled={isInternshala}
                                    />
                                </div>
                                <div className="form-div">
                                    <label htmlFor="uploader">Upload Resume</label>
                                    <FileUploader onFileSelect={handleFileSelect} />
                                </div>
                                <button className="primary-button" type="submit">Analyse Resume</button>
                            </form>
                        </>
                    )}
                </div>
            </section>
        </main>
    );
};

export default upload;
