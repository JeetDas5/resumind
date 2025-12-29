interface Resume {
    id: string;
    companyName?: string;
    jobTitle?: string;
    imagePath: string;
    resumePath: string;
    feedback: Feedback;
}

interface Feedback {
    overallScore: number;
    ATS: {
        score: number; tips: {
            type: "good" | "improve"; tip: string;
        }[];
    };
    toneAndStyle: {
        score: number; tips: {
            type: "good" | "improve"; tip: string; explanation: string;
        }[];
    };
    content: {
        score: number; tips: {
            type: "good" | "improve"; tip: string; explanation: string;
        }[];
    };
    structure: {
        score: number; tips: {
            type: "good" | "improve"; tip: string; explanation: string;
        }[];
    };
    skills: {
        score: number; tips: {
            type: "good" | "improve"; tip: string; explanation: string;
        }[];
    };
    dateValidation?: {
        score: number;
        issues: DateValidationIssue[];
        summary: string;
    };
}

interface DateValidationIssue {
    type: 'critical' | 'warning' | 'suggestion';
    category: 'education' | 'work' | 'general';
    message: string;
    detectedDate: string;
    suggestedFix?: string;
    confidence: number;
}