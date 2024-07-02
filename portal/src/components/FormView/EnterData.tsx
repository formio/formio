import { Form } from "@formio/react";
import { useLocation } from "wouter";

export const EnterData = ({ url }: { url: string }) => {
    const setLocation = useLocation()[1];
    return (
        <div className="panel enter-data active">
            <Form src={url} onSubmitDone={() => setLocation("/view")} />
        </div>
    );
};
