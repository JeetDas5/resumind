import type {Route} from "./+types/home";
import Navbar from "~/components/Navbar";
import ResumeCard from "~/components/ResumeCard";
import {usePuterStore} from "~/lib/puter";
import {Link, useNavigate} from "react-router";
import {useEffect, useState} from "react";

export function meta({}: Route.MetaArgs) {
    return [{title: "Resumind"}, {name: "description", content: "Smart feedback for your resume"},];
}

export default function Home() {
    const {isLoading, auth, kv} = usePuterStore();
    const navigate = useNavigate();

    const [resumeUrl, setResumeUrl] = useState('');
    const [resumes, setResumes] = useState<Resume[]>([]);
    const [loadingResumes, setLoadingResumes] = useState(false);

    useEffect(() => {
        if (!auth.isAuthenticated) navigate("/auth?next=/");
    }, [auth.isAuthenticated]);

    useEffect(() => {
        const loadResumes = async () => {
            setLoadingResumes(true);

            const resumes = (await kv.list('resume:*', true)) as KVItem[];

            const parsedResumes = resumes?.map((resume) => (JSON.parse(resume.value) as Resume))
            console.log(parsedResumes);
            setResumes(parsedResumes || []);
            setLoadingResumes(false);
        }
        loadResumes();
    }, []);


    return <main className="bg-[url('/images/bg-main.svg')] bg-cover">
        <Navbar/>
        <section className="main-section">
            <div className="page-heading py-16">
                <h1>Track your applications & Resume Ratings</h1>
                {!(loadingResumes) && resumes.length === 0 ? (
                    <h2>No resumes found. Upload your first resume to get feedback.</h2>) : (
                    <h2>Review your submissions and check your AI powered feedback.</h2>)}
            </div>

            {loadingResumes && (<div className="flex flex-col items-center justify-center ">
                <img src="/images/resume-scan-2.gif" className="w-[200px]" alt=""/>
            </div>)}

            {!loadingResumes && resumes.length > 0 && (<div className="resumes-section">
                {resumes.map((resume) => (<ResumeCard key={resume.id} resume={resume}/>))}
            </div>)}

            {!loadingResumes && resumes.length === 0 && (
                <div>
                    <Link to="/upload" className="primaryButton w-fit text-xl font-semibold">
                        Upload Resume
                    </Link>
                </div>
            )}
        </section>
    </main>
}
