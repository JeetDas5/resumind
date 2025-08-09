import React from 'react';
import ScoreGauge from "~/components/ScoreGauge";

const Summary = ({feedback}: { feedback: Feedback }) => {
    return (<div className="bg-white rounded-2xl w-full">
            <div className="flex flex-row items-center p-4 gap-"></div>
            <ScoreGauge score={feedback.overallScore || 0}/>
        </div>);
};

export default Summary;
