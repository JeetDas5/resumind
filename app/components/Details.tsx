import {cn} from "~/lib/utils";
import {Accordion, AccordionContent, AccordionHeader, AccordionItem,} from "./Accordian";

interface DateValidationIssue {
    type: 'critical' | 'warning' | 'suggestion';
    category: 'education' | 'work' | 'general';
    message: string;
    detectedDate: string;
    suggestedFix?: string;
    confidence: number;
}

const ScoreBadge = ({score}: { score: number }) => {
    return (<div
            className={cn("flex flex-row gap-1 items-center px-2 py-0.5 rounded-[96px]", score > 69 ? "bg-badge-green" : score > 39 ? "bg-badge-yellow" : "bg-badge-red")}
        >
            <img
                src={score > 69 ? "/icons/check.svg" : "/icons/warning.svg"}
                alt="score"
                className="size-4"
            />
            <p
                className={cn("text-sm font-medium", score > 69 ? "text-badge-green-text" : score > 39 ? "text-badge-yellow-text" : "text-badge-red-text")}
            >
                {score}/100
            </p>
        </div>);
};

const CategoryHeader = ({
                            title, categoryScore,
                        }: {
    title: string; categoryScore: number;
}) => {
    return (<div className="flex flex-row gap-4 items-center py-2">
            <p className="text-2xl font-semibold">{title}</p>
            <ScoreBadge score={categoryScore}/>
        </div>);
};

const CategoryContent = ({
                             tips,
                         }: {
    tips: { type: "good" | "improve"; tip: string; explanation: string }[];
}) => {
    return (<div className="flex flex-col gap-4 items-center w-full">
            <div className="bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-cols-2 gap-4">
                {tips.map((tip, index) => (<div className="flex flex-row gap-2 items-center" key={index}>
                        <img
                            src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                            alt="score"
                            className="size-5"
                        />
                        <p className="text-xl text-gray-500 ">{tip.tip}</p>
                    </div>))}
            </div>
            <div className="flex flex-col gap-4 w-full">
                {tips.map((tip, index) => (<div
                        key={index + tip.tip}
                        className={cn("flex flex-col gap-2 rounded-2xl p-4", tip.type === "good" ? "bg-green-50 border border-green-200 text-green-700" : "bg-yellow-50 border border-yellow-200 text-yellow-700")}
                    >
                        <div className="flex flex-row gap-2 items-center">
                            <img
                                src={tip.type === "good" ? "/icons/check.svg" : "/icons/warning.svg"}
                                alt="score"
                                className="size-5"
                            />
                            <p className="text-xl font-semibold">{tip.tip}</p>
                        </div>
                        <p>{tip.explanation}</p>
                    </div>))}
            </div>
        </div>);
};

const DateValidationContent = ({
                                   dateValidation,
                               }: {
    dateValidation: {
        score: number;
        issues: DateValidationIssue[];
        summary: string;
    };
}) => {
    const criticalIssues = dateValidation.issues.filter(issue => issue.type === 'critical');
    const warningIssues = dateValidation.issues.filter(issue => issue.type === 'warning');
    const suggestionIssues = dateValidation.issues.filter(issue => issue.type === 'suggestion');
    const hasNoIssues = dateValidation.issues.length === 0;

    return (<div className="flex flex-col gap-4 items-center w-full">
            {/* Summary Section */}
            <div className={cn(
                "w-full rounded-lg px-5 py-4",
                hasNoIssues ? "bg-green-50 border border-green-200" : "bg-gray-50"
            )}>
                <div className="flex flex-row gap-2 items-center mb-2">
                    <img
                        src={hasNoIssues ? "/icons/check.svg" : "/icons/warning.svg"}
                        alt="validation status"
                        className="size-5"
                    />
                    <p className={cn(
                        "text-lg font-semibold",
                        hasNoIssues ? "text-green-700" : "text-gray-700"
                    )}>
                        {hasNoIssues ? "Date Validation Passed" : "Date Validation Results"}
                    </p>
                </div>
                <p className={cn(
                    "text-lg",
                    hasNoIssues ? "text-green-700" : "text-gray-700"
                )}>
                    {dateValidation.summary}
                </p>
            </div>

            {/* Issues Grid for Quick Overview */}
            {dateValidation.issues.length > 0 && (
                <div className="bg-gray-50 w-full rounded-lg px-5 py-4 grid grid-cols-2 gap-4">
                    {criticalIssues.length > 0 && (
                        <div className="flex flex-row gap-2 items-center">
                            <img src="/icons/warning.svg" alt="critical" className="size-5" />
                            <p className="text-xl text-red-600">
                                {criticalIssues.length} Critical Issue{criticalIssues.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                    {warningIssues.length > 0 && (
                        <div className="flex flex-row gap-2 items-center">
                            <img src="/icons/warning.svg" alt="warning" className="size-5" />
                            <p className="text-xl text-yellow-600">
                                {warningIssues.length} Warning{warningIssues.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                    {suggestionIssues.length > 0 && (
                        <div className="flex flex-row gap-2 items-center">
                            <img src="/icons/check.svg" alt="suggestion" className="size-5" />
                            <p className="text-xl text-blue-600">
                                {suggestionIssues.length} Suggestion{suggestionIssues.length > 1 ? 's' : ''}
                            </p>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Issues */}
            {dateValidation.issues.length > 0 && (
                <div className="flex flex-col gap-4 w-full">
                    {/* Critical Issues First */}
                    {criticalIssues.map((issue, index) => (
                        <div
                            key={`critical-${index}`}
                            className="flex flex-col gap-3 rounded-2xl p-4 bg-red-50 border border-red-200 text-red-700"
                        >
                            <div className="flex flex-row gap-2 items-center">
                                <img src="/icons/warning.svg" alt="critical" className="size-5" />
                                <p className="text-xl font-semibold">
                                    Critical: {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)} Date Issue
                                </p>
                            </div>
                            <p className="text-base">{issue.message}</p>
                            {issue.detectedDate && (
                                <div className="bg-red-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        Detected date: <span className="font-mono">{issue.detectedDate}</span>
                                    </p>
                                </div>
                            )}
                            {issue.suggestedFix && (
                                <div className="bg-red-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        💡 Suggested fix: {issue.suggestedFix}
                                    </p>
                                </div>
                            )}
                            <div className="text-xs opacity-75">
                                Confidence: {Math.round(issue.confidence * 100)}%
                            </div>
                        </div>
                    ))}

                    {/* Warning Issues */}
                    {warningIssues.map((issue, index) => (
                        <div
                            key={`warning-${index}`}
                            className="flex flex-col gap-3 rounded-2xl p-4 bg-yellow-50 border border-yellow-200 text-yellow-700"
                        >
                            <div className="flex flex-row gap-2 items-center">
                                <img src="/icons/warning.svg" alt="warning" className="size-5" />
                                <p className="text-xl font-semibold">
                                    Warning: {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)} Date Issue
                                </p>
                            </div>
                            <p className="text-base">{issue.message}</p>
                            {issue.detectedDate && (
                                <div className="bg-yellow-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        Detected date: <span className="font-mono">{issue.detectedDate}</span>
                                    </p>
                                </div>
                            )}
                            {issue.suggestedFix && (
                                <div className="bg-yellow-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        💡 Suggested fix: {issue.suggestedFix}
                                    </p>
                                </div>
                            )}
                            <div className="text-xs opacity-75">
                                Confidence: {Math.round(issue.confidence * 100)}%
                            </div>
                        </div>
                    ))}

                    {/* Suggestion Issues */}
                    {suggestionIssues.map((issue, index) => (
                        <div
                            key={`suggestion-${index}`}
                            className="flex flex-col gap-3 rounded-2xl p-4 bg-blue-50 border border-blue-200 text-blue-700"
                        >
                            <div className="flex flex-row gap-2 items-center">
                                <img src="/icons/check.svg" alt="suggestion" className="size-5" />
                                <p className="text-xl font-semibold">
                                    Suggestion: {issue.category.charAt(0).toUpperCase() + issue.category.slice(1)} Enhancement
                                </p>
                            </div>
                            <p className="text-base">{issue.message}</p>
                            {issue.detectedDate && (
                                <div className="bg-blue-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        Detected date: <span className="font-mono">{issue.detectedDate}</span>
                                    </p>
                                </div>
                            )}
                            {issue.suggestedFix && (
                                <div className="bg-blue-100 rounded-lg p-2">
                                    <p className="text-sm font-medium">
                                        💡 Suggestion: {issue.suggestedFix}
                                    </p>
                                </div>
                            )}
                            <div className="text-xs opacity-75">
                                Confidence: {Math.round(issue.confidence * 100)}%
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Positive confirmation when no issues */}
            {hasNoIssues && (
                <div className="flex flex-col gap-2 rounded-2xl p-4 bg-green-50 border border-green-200 text-green-700 w-full">
                    <div className="flex flex-row gap-2 items-center">
                        <img src="/icons/check.svg" alt="success" className="size-5" />
                        <p className="text-xl font-semibold">All Dates Look Good!</p>
                    </div>
                    <p>Your resume dates appear to be accurate and properly formatted. No date-related issues were detected.</p>
                </div>
            )}
        </div>);
};

const Details = ({feedback}: { feedback: Feedback }) => {
    return (<div className="flex flex-col gap-4 w-full">
            <Accordion>
                <AccordionItem id="tone-style">
                    <AccordionHeader itemId="tone-style">
                        <CategoryHeader
                            title="Tone & Style"
                            categoryScore={feedback.toneAndStyle.score}
                        />
                    </AccordionHeader>
                    <AccordionContent itemId="tone-style">
                        <CategoryContent tips={feedback.toneAndStyle.tips}/>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem id="content">
                    <AccordionHeader itemId="content">
                        <CategoryHeader
                            title="Content"
                            categoryScore={feedback.content.score}
                        />
                    </AccordionHeader>
                    <AccordionContent itemId="content">
                        <CategoryContent tips={feedback.content.tips}/>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem id="structure">
                    <AccordionHeader itemId="structure">
                        <CategoryHeader
                            title="Structure"
                            categoryScore={feedback.structure.score}
                        />
                    </AccordionHeader>
                    <AccordionContent itemId="structure">
                        <CategoryContent tips={feedback.structure.tips}/>
                    </AccordionContent>
                </AccordionItem>
                <AccordionItem id="skills">
                    <AccordionHeader itemId="skills">
                        <CategoryHeader
                            title="Skills"
                            categoryScore={feedback.skills.score}
                        />
                    </AccordionHeader>
                    <AccordionContent itemId="skills">
                        <CategoryContent tips={feedback.skills.tips}/>
                    </AccordionContent>
                </AccordionItem>
                {feedback.dateValidation && (
                    <AccordionItem id="date-validation">
                        <AccordionHeader itemId="date-validation">
                            <CategoryHeader
                                title="Date Validation"
                                categoryScore={feedback.dateValidation.score}
                            />
                        </AccordionHeader>
                        <AccordionContent itemId="date-validation">
                            <DateValidationContent dateValidation={feedback.dateValidation}/>
                        </AccordionContent>
                    </AccordionItem>
                )}
            </Accordion>
        </div>);
};

export default Details;