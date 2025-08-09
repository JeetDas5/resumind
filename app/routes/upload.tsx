import React, {useState} from 'react';
import Navbar from "~/components/Navbar";
import FileUploader from "~/components/FileUploader";
import {usePuterStore} from "~/lib/puter";
import {useNavigate} from "react-router";
import {convertPdfToImage} from "~/lib/PdfToImage";
import {generateUUID} from "~/lib/utils";
import {prepareInstructions} from "../../constants";


export const meta = () => ([{title: "Resumind | Upload"}, {name: "description", content: "Upload your resume"},])

const upload = () => {
    const [isProcessing, setIsProcessing] = useState(false);
    const [statusText, setStatusText] = useState("");
    const [file, setFile] = useState<File | null>(null);

    const {fs, auth, isLoading, ai, kv} = usePuterStore();
    const navigate = useNavigate();

    const handleFileSelect = (file: File | null) => {
        if (file) {
            setFile(file);
        } else {
            setFile(null);
        }
    }

    const handleAnalyse = async ({companyName, jobTitle, jobDescription, file}: {
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
        }

        await kv.set(`resume:${uuid}`, JSON.stringify(data));
        setStatusText("Analysing your resume...");

        const feedback = await ai.feedback(uploadedFile.path, prepareInstructions({jobDescription, jobTitle}));

        if (!feedback) {
            setIsProcessing(false);
            setStatusText("Failed to analyse your resume. Please try again.");
            return;
        }
        try {
            // Handle different possible response structures from Claude 3.7 Sonnet
            let feedbackText = '';

            if (typeof feedback.message.content === 'string') {
                feedbackText = feedback.message.content;
            } else if (Array.isArray(feedback.message.content)) {
                // Find the text content in the array
                for (const content of feedback.message.content) {
                    if (content.type === 'text' && content.text) {
                        feedbackText = content.text;
                        break;
                    }
                }

                // If we didn't find text content with type 'text', try the first element
                if (!feedbackText && feedback.message.content.length > 0) {
                    feedbackText = feedback.message.content[0].text || '';
                }
            }

            if (!feedbackText) {
                throw new Error('Could not extract text from AI response');
            }

            // Clean the response to ensure it's valid JSON
            feedbackText = feedbackText.trim();
            // Remove any markdown code block markers if present
            if (feedbackText.startsWith('```json')) {
                feedbackText = feedbackText.substring(7);
            }
            if (feedbackText.startsWith('```')) {
                feedbackText = feedbackText.substring(3);
            }
            if (feedbackText.endsWith('```')) {
                feedbackText = feedbackText.substring(0, feedbackText.length - 3);
            }

            // Parse the JSON
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

    }

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget.closest("form");
        if (!form) return;
        const formData = new FormData(form);
        const companyName = formData.get("company-name") as string;
        const jobTitle = formData.get("job-title") as string;
        const jobDescription = formData.get("job-description") as string;

        if (!file) return;

        handleAnalyse({companyName, jobTitle, jobDescription, file});

    }

    return (<main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar/>
        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Smart Feedback for your dream job</h1>
                {isProcessing ? (<>
                    <h2>{statusText}</h2>
                    <img src="/images/resume-scan.gif" alt="resume"
                         className="w-full md:w-1/2 "
                    />
                </>) : (<h2>Drop your resume for an ATS score and improvement tips</h2>)}
                {!(isProcessing) && (
                    <form id="upload-form" onSubmit={handleSubmit} className="flex flex-col gap-4 mt-8">
                        <div className="form-div">
                            <label htmlFor="company-name">Company Name</label>
                            <input type="text" name="company-name" id="company-name" placeholder="Company Name"/>
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-title">Job Title</label>
                            <input type="text" name="job-title" id="job-title" placeholder="Job Title"/>
                        </div>
                        <div className="form-div">
                            <label htmlFor="job-description">Job Description</label>
                            <textarea rows={5} name="job-description" id="job-description"
                                      placeholder="Job Description"/>
                        </div>
                        <div className="form-div">
                            <label htmlFor="uploader">Upload Resume</label>
                            <FileUploader onFileSelect={handleFileSelect}/>
                        </div>
                        <button className="primary-button" type="submit">Analyse Resume</button>
                    </form>)}
            </div>
        </section>
    </main>);
};

export default upload;
